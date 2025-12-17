import { createServerClient } from "@/lib/supabaseServerClient";
import { NextRequest, NextResponse } from "next/server";

function getJSTDateString(date?: Date): string {
    const d = date || new Date();
    return d.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");
}

function getJSTDateInfo(date: Date) {
    const jstDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    return {
        year: jstDate.getFullYear(),
        month: jstDate.getMonth(),
        day: jstDate.getDate(),
    };
}

export async function GET(request: NextRequest) {
    const supabase = await createServerClient() as any;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "認証エラー" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (profileError || !profile?.store_id) {
        return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }

    const storeId = profile.store_id;
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "today";

    const now = new Date();
    const jstInfo = getJSTDateInfo(now);

    // Calculate date range based on period
    let startDate: Date;
    let endDate = now;

    switch (period) {
        case "today":
            startDate = new Date(jstInfo.year, jstInfo.month, jstInfo.day);
            break;
        case "week":
            startDate = new Date(jstInfo.year, jstInfo.month, jstInfo.day - 7);
            break;
        case "month":
            startDate = new Date(jstInfo.year, jstInfo.month, 1);
            break;
        case "year":
            startDate = new Date(jstInfo.year, 0, 1);
            break;
        default:
            startDate = new Date(jstInfo.year, jstInfo.month, jstInfo.day);
    }

    try {
        // Get cast profiles (在籍中・体入のみ)
        const { data: castProfiles } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url, status")
            .eq("store_id", storeId)
            .eq("role", "cast")
            .in("status", ["在籍中", "体入"]);

        if (!castProfiles || castProfiles.length === 0) {
            return NextResponse.json({ rankings: [], period });
        }

        const castProfileIds = castProfiles.map((p: any) => p.id);
        const profileMap = new Map<string, any>(castProfiles.map((p: any) => [p.id, p]));

        // Get table sessions for the period
        const { data: sessions } = await supabase
            .from("table_sessions")
            .select("id, start_time, total_amount")
            .eq("store_id", storeId)
            .gte("start_time", startDate.toISOString())
            .lte("start_time", endDate.toISOString());

        const sessionIds = sessions?.map((s: any) => s.id) || [];

        // Get orders with cast assignments
        let orders: any[] = [];
        if (sessionIds.length > 0) {
            const { data: orderData } = await supabase
                .from("orders")
                .select("table_session_id, cast_id, amount, quantity")
                .in("table_session_id", sessionIds)
                .in("cast_id", castProfileIds);

            if (orderData) orders = orderData;
        }

        // Get cast assignments (shimei, douhan, etc.)
        let castAssignments: any[] = [];
        if (sessionIds.length > 0) {
            const { data: assignmentData } = await supabase
                .from("cast_assignments")
                .select("table_session_id, cast_id, assignment_type")
                .in("table_session_id", sessionIds)
                .in("cast_id", castProfileIds);

            if (assignmentData) castAssignments = assignmentData;
        }

        // Calculate rankings
        const castStats = new Map<string, {
            profileId: string;
            name: string;
            avatarUrl: string | null;
            status: string | null;
            totalSales: number;
            orderCount: number;
            shimeiCount: number;
            douhanCount: number;
            sessionCount: number;
        }>();

        // Initialize stats for all casts
        for (const [id, profile] of profileMap) {
            castStats.set(id, {
                profileId: id,
                name: profile.display_name || "不明",
                avatarUrl: profile.avatar_url,
                status: profile.status,
                totalSales: 0,
                orderCount: 0,
                shimeiCount: 0,
                douhanCount: 0,
                sessionCount: 0,
            });
        }

        // Process orders
        for (const order of orders) {
            if (!order.cast_id) continue;
            const stats = castStats.get(order.cast_id);
            if (!stats) continue;

            const amount = (order.amount || 0) * (order.quantity || 1);
            stats.totalSales += amount;
            stats.orderCount += order.quantity || 1;
        }

        // Process cast assignments
        const sessionCastMap = new Map<string, Set<string>>();
        for (const assignment of castAssignments) {
            if (!assignment.cast_id) continue;
            const stats = castStats.get(assignment.cast_id);
            if (!stats) continue;

            // Count shimei and douhan
            if (assignment.assignment_type === "shimei") {
                stats.shimeiCount += 1;
            } else if (assignment.assignment_type === "douhan") {
                stats.douhanCount += 1;
            }

            // Track unique sessions per cast
            if (!sessionCastMap.has(assignment.cast_id)) {
                sessionCastMap.set(assignment.cast_id, new Set());
            }
            sessionCastMap.get(assignment.cast_id)!.add(assignment.table_session_id);
        }

        // Update session counts
        for (const [castId, sessions] of sessionCastMap) {
            const stats = castStats.get(castId);
            if (stats) {
                stats.sessionCount = sessions.size;
            }
        }

        // Convert to array and sort by total sales
        const rankings = Array.from(castStats.values())
            .sort((a, b) => b.totalSales - a.totalSales)
            .map((stats, index) => ({
                rank: index + 1,
                ...stats,
            }));

        return NextResponse.json({ rankings, period });
    } catch (error) {
        console.error("Ranking API error:", error);
        return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 });
    }
}
