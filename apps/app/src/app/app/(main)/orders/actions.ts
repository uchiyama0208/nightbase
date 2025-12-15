"use server";

import { getAuthContext } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

export interface OrderWithDetails {
    id: string;
    table_session_id: string;
    menu_id: string | null;
    item_name: string | null;
    quantity: number;
    amount: number;
    status: string;
    created_at: string;
    menu: {
        name: string;
        price: number;
    } | null;
    table_session: {
        id: string;
        status: string;
        table: {
            id: string;
            name: string;
        } | null;
    } | null;
}

// 特別料金のリスト
const SPECIAL_FEE_NAMES = ["セット料金", "指名料", "場内料金", "同伴料", "延長料金"];

// 営業日の開始時刻を計算
function getBusinessDayStart(daySwitchTime: string): string {
    // daySwitchTimeは "HH:mm:ss" または "HH:mm" 形式
    const parts = daySwitchTime.split(":");
    const switchHour = parseInt(parts[0], 10) || 5;
    const switchMinute = parseInt(parts[1], 10) || 0;

    // 現在のJST時刻を取得
    const now = new Date();
    const jstDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const currentHour = jstDate.getHours();
    const currentMinute = jstDate.getMinutes();

    // 現在時刻が切り替え時間より前の場合は前日の営業日
    if (currentHour < switchHour || (currentHour === switchHour && currentMinute < switchMinute)) {
        jstDate.setDate(jstDate.getDate() - 1);
    }

    const businessDate = jstDate.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");

    // 時刻部分を HH:mm:ss 形式に正規化
    const timeStr = parts.length >= 3
        ? `${parts[0]}:${parts[1]}:${parts[2]}`
        : `${parts[0]}:${parts[1]}:00`;

    // 営業日の切り替え時間をタイムスタンプとして返す
    return `${businessDate}T${timeStr}+09:00`;
}

// 全ての注文を取得（今日の営業日の注文のみ）
export async function getAllOrders(): Promise<OrderWithDetails[]> {
    try {
        const { supabase, storeId } = await getAuthContext();

        // 店舗の日付切り替え時間を取得
        const { data: store } = await supabase
            .from("stores")
            .select("day_switch_time")
            .eq("id", storeId)
            .single();

        const daySwitchTime = store?.day_switch_time || "05:00";
        const businessDayStart = getBusinessDayStart(daySwitchTime);

        // まず店舗のセッションIDを取得
        const { data: sessions, error: sessionError } = await supabase
            .from("table_sessions")
            .select("id")
            .eq("store_id", storeId);

        if (sessionError || !sessions || sessions.length === 0) {
            return [];
        }

        const sessionIds = sessions.map(s => s.id);

        // 営業日開始以降の注文を取得
        const { data, error } = await supabase
            .from("orders")
            .select(`
                id,
                table_session_id,
                menu_id,
                item_name,
                quantity,
                amount,
                status,
                created_at,
                menus(name, price),
                table_sessions(
                    id,
                    status,
                    tables(id, name)
                )
            `)
            .in("table_session_id", sessionIds)
            .gte("created_at", businessDayStart)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching orders:", JSON.stringify(error, null, 2));
            return [];
        }

        // データを整形
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedOrders = (data || []).map((order: any) => {
            // table_sessionsが配列の場合は最初の要素を使用
            const tableSession = Array.isArray(order.table_sessions)
                ? order.table_sessions[0]
                : order.table_sessions;

            return {
                ...order,
                menu: order.menus,
                table_session: tableSession ? {
                    id: tableSession.id,
                    status: tableSession.status,
                    table: Array.isArray(tableSession.tables)
                        ? tableSession.tables[0]
                        : tableSession.tables
                } : null
            };
        });

        // 特別料金をフィルタリング
        const filteredOrders = formattedOrders.filter(order => {
            // menu_idがある場合は通常の注文
            if (order.menu_id) return true;
            // item_nameが特別料金の場合は除外
            if (order.item_name && SPECIAL_FEE_NAMES.includes(order.item_name)) {
                return false;
            }
            // それ以外（一時メニュー）は含める
            return true;
        });

        return filteredOrders as unknown as OrderWithDetails[];
    } catch (e) {
        console.error("Error in getAllOrders:", e);
        return [];
    }
}

// 注文ステータスを更新
export async function updateOrderStatus(orderId: string, status: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase } = await getAuthContext();

        const { error } = await supabase
            .from("orders")
            .update({ status })
            .eq("id", orderId);

        if (error) {
            console.error("Error updating order status:", error);
            return { success: false, error: "ステータスの更新に失敗しました" };
        }

        revalidatePath("/app/orders");
        revalidatePath("/app/floor");
        return { success: true };
    } catch {
        return { success: false, error: "ステータスの更新に失敗しました" };
    }
}

// 呼び出しの型定義
export interface TableCall {
    id: string;
    store_id: string;
    table_id: string;
    table_session_id: string | null;
    status: string;
    created_at: string;
    table: {
        id: string;
        name: string;
    } | null;
}

// 呼び出し一覧を取得
export async function getTableCalls(): Promise<TableCall[]> {
    try {
        const { supabase, storeId } = await getAuthContext();

        const { data, error } = await supabase
            .from("table_calls")
            .select(`
                id,
                store_id,
                table_id,
                table_session_id,
                status,
                created_at,
                tables(id, name)
            `)
            .eq("store_id", storeId)
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching table calls:", error);
            return [];
        }

        return (data || []).map(call => ({
            ...call,
            table: call.tables,
        })) as unknown as TableCall[];
    } catch {
        return [];
    }
}

// 呼び出しを解決（対応済みにする）
export async function resolveTableCall(callId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase } = await getAuthContext();

        const { error } = await supabase
            .from("table_calls")
            .delete()
            .eq("id", callId);

        if (error) {
            console.error("Error resolving table call:", error);
            return { success: false, error: "呼び出しの解決に失敗しました" };
        }

        return { success: true };
    } catch {
        return { success: false, error: "呼び出しの解決に失敗しました" };
    }
}
