import { createServerClient } from "@/lib/supabaseServerClient";
import { NextRequest, NextResponse } from "next/server";

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
    const date = searchParams.get("date");

    if (!date) {
        return NextResponse.json({ error: "日付を指定してください" }, { status: 400 });
    }

    const startDateTime = new Date(`${date}T00:00:00+09:00`);
    const endDateTime = new Date(`${date}T23:59:59+09:00`);

    try {
        // Get table sessions with table info
        const { data: sessions } = await supabase
            .from("table_sessions")
            .select("id, guest_count, start_time, end_time, total_amount, status, table_id")
            .eq("store_id", storeId)
            .gte("start_time", startDateTime.toISOString())
            .lte("start_time", endDateTime.toISOString())
            .order("start_time", { ascending: false });

        // Get table names
        const tableIds = [...new Set((sessions || []).filter((s: any) => s.table_id).map((s: any) => s.table_id))];
        let tableMap = new Map<string, string>();
        if (tableIds.length > 0) {
            const { data: tablesData } = await supabase
                .from("tables")
                .select("id, name")
                .in("id", tableIds);
            if (tablesData) {
                tableMap = new Map(tablesData.map((t: any) => [t.id, t.name]));
            }
        }

        // Format slips
        const slips = (sessions || []).map((session: any) => {
            const jstDate = new Date(new Date(session.start_time).toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
            const hours = jstDate.getHours().toString().padStart(2, "0");
            const minutes = jstDate.getMinutes().toString().padStart(2, "0");

            return {
                id: session.id,
                time: `${hours}:${minutes}`,
                tableName: session.table_id ? tableMap.get(session.table_id) || "不明" : "指定なし",
                guestCount: session.guest_count,
                totalAmount: session.total_amount || 0,
                status: session.status,
            };
        });

        // Calculate totals
        const slipCount = slips.length;
        const totalGuests = slips.reduce((sum: number, s: any) => sum + s.guestCount, 0);

        return NextResponse.json({ slips, slipCount, totalGuests });
    } catch (error) {
        console.error("Sales detail API error:", error);
        return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 });
    }
}
