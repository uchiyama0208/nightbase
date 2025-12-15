import { createServerClient } from "@/lib/supabaseServerClient";
import { NextRequest, NextResponse } from "next/server";

// JST日付文字列を取得
function getJSTDateString(date: Date): string {
    return date.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");
}

// JSTの日付情報を取得
function getJSTDateInfo(date: Date) {
    const jstDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    return {
        year: jstDate.getFullYear(),
        month: jstDate.getMonth(),
        day: jstDate.getDate(),
        dayOfWeek: jstDate.getDay(),
    };
}

// JSTの日付を生成
function createJSTDate(year: number, month: number, day: number): Date {
    const date = new Date(year, month, day, 0, 0, 0);
    return new Date(date.getTime() - 9 * 60 * 60 * 1000);
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

    const now = new Date();
    const jstInfo = getJSTDateInfo(now);

    // 過去90日分のデータを取得
    const startDate = createJSTDate(jstInfo.year, jstInfo.month - 3, 1);
    const endDate = now;

    try {
        // Get table sessions
        const { data: sessions, error: sessionsError } = await supabase
            .from("table_sessions")
            .select("id, start_time, total_amount")
            .eq("store_id", storeId)
            .gte("start_time", startDate.toISOString())
            .lte("start_time", endDate.toISOString())
            .order("start_time", { ascending: false });

        if (sessionsError) {
            return NextResponse.json({ error: sessionsError.message }, { status: 500 });
        }

        // Get orders with menu info for cast_back calculation
        const sessionIds = sessions?.map((s: any) => s.id) || [];
        let orders: any[] = [];

        if (sessionIds.length > 0) {
            const { data: orderData } = await supabase
                .from("orders")
                .select("table_session_id, menu_id, quantity, amount")
                .in("table_session_id", sessionIds);

            if (orderData) {
                orders = orderData;
            }
        }

        // Get menus for cast_back_amount
        const { data: menusData } = await supabase
            .from("menus")
            .select("id, cast_back_amount")
            .eq("store_id", storeId);

        const menuCastBackMap = new Map<string, number>(
            menusData?.map((m: any) => [m.id, m.cast_back_amount || 0]) || []
        );

        // Calculate cast back per session
        const sessionCastBackMap = new Map<string, number>();
        for (const order of orders) {
            const castBack = order.menu_id ? (menuCastBackMap.get(order.menu_id) || 0) * (order.quantity || 1) : 0;
            const current = sessionCastBackMap.get(order.table_session_id) || 0;
            sessionCastBackMap.set(order.table_session_id, current + castBack);
        }

        // Group by date
        const dailyData = new Map<string, {
            date: string;
            label: string;
            sales: number;
            payments: number;
            profit: number;
        }>();

        const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

        for (const session of (sessions || [])) {
            const sessionDate = new Date(session.start_time);
            const dateKey = getJSTDateString(sessionDate);
            const info = getJSTDateInfo(sessionDate);
            const label = `${info.month + 1}/${info.day} (${weekdays[info.dayOfWeek]})`;

            const existing = dailyData.get(dateKey) || {
                date: dateKey,
                label,
                sales: 0,
                payments: 0,
                profit: 0,
            };

            const sales = session.total_amount || 0;
            const payments = sessionCastBackMap.get(session.id) || 0;

            existing.sales += sales;
            existing.payments += payments;
            existing.profit = existing.sales - existing.payments;

            dailyData.set(dateKey, existing);
        }

        const days = Array.from(dailyData.values())
            .sort((a, b) => b.date.localeCompare(a.date));

        // Calculate totals
        const totals = days.reduce((acc, d) => ({
            sales: acc.sales + d.sales,
            payments: acc.payments + d.payments,
            profit: acc.profit + d.profit,
        }), { sales: 0, payments: 0, profit: 0 });

        return NextResponse.json({ days, totals });
    } catch (error) {
        console.error("Sales API error:", error);
        return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 });
    }
}
