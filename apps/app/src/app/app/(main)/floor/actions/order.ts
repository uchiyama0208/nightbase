"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import { revalidateFloorAndSlips, getAuthenticatedStoreId } from "./auth";
import { SPECIAL_FEE_NAMES, SPECIAL_FEE_NAME_VALUES, type OrderItem, type OrderUpdateData, type OrderData } from "./types";
import { sendPushNotification } from "@/lib/notifications/push";

/**
 * オーダーを作成
 */
export async function createOrder(
    sessionId: string,
    items: OrderItem[],
    guestId?: string | null,
    castId?: string | null,
    sessionGuestId?: string | null
) {
    const { supabase, storeId } = await getAuthenticatedStoreId();

    const orders = items.map(item => {
        const isSpecialFee = SPECIAL_FEE_NAMES[item.menuId as keyof typeof SPECIAL_FEE_NAMES];
        const isTempItem = item.menuId.startsWith('temp-');

        return {
            table_session_id: sessionId,
            store_id: storeId,
            menu_id: (isSpecialFee || isTempItem) ? null : item.menuId,
            item_name: isSpecialFee
                ? SPECIAL_FEE_NAMES[item.menuId as keyof typeof SPECIAL_FEE_NAMES]
                : (isTempItem ? item.name : null),
            quantity: item.quantity,
            amount: item.amount,
            guest_id: guestId || null,
            cast_id: castId || null,
            session_guest_id: sessionGuestId || null,
            status: 'pending',
            start_time: item.startTime || null,
            end_time: item.endTime || null,
        };
    });

    const { error } = await (supabase as any)
        .from("orders")
        .insert(orders);

    if (error) throw error;

    // 在庫管理: メニューの在庫を減らす
    for (const item of items) {
        const isSpecialFee = SPECIAL_FEE_NAMES[item.menuId as keyof typeof SPECIAL_FEE_NAMES];
        const isTempItem = item.menuId.startsWith('temp-');

        if (isSpecialFee || isTempItem) continue;

        const { data: menu } = await (supabase as any)
            .from("menus")
            .select("stock_enabled, stock_quantity")
            .eq("id", item.menuId)
            .single();

        if (menu?.stock_enabled && menu.stock_quantity > 0) {
            const newQuantity = Math.max(0, menu.stock_quantity - item.quantity);
            await (supabase as any)
                .from("menus")
                .update({ stock_quantity: newQuantity })
                .eq("id", item.menuId);
        }
    }

    revalidatePath("/app/slips");
    revalidatePath("/app/floor");
    revalidatePath("/app/menus");

    // プッシュ通知を送信
    try {
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        const itemNames = items.slice(0, 3).map(item => {
            const isSpecialFee = SPECIAL_FEE_NAMES[item.menuId as keyof typeof SPECIAL_FEE_NAMES];
            return isSpecialFee || item.name || "商品";
        }).join("、");
        const suffix = items.length > 3 ? " 他" : "";

        await sendPushNotification({
            storeId,
            notificationType: "order_notification",
            title: "注文通知",
            body: `${itemNames}${suffix}（${itemCount}点）の注文が入りました`,
            url: "/app/floor",
        });
    } catch (error) {
        // 通知エラーは無視（注文処理自体は成功しているため）
        console.error("Failed to send order notification:", error);
    }

    return { success: true };
}

/**
 * オーダーを更新
 */
export async function updateOrder(orderId: string, updates: OrderUpdateData) {
    const supabase = await createServerClient() as any;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.castId !== undefined) dbUpdates.cast_id = updates.castId;
    if (updates.guestId !== undefined) dbUpdates.guest_id = updates.guestId;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;

    const { error } = await supabase
        .from("orders")
        .update(dbUpdates)
        .eq("id", orderId);

    if (error) throw error;
    revalidatePath("/app/slips");
    revalidatePath("/app/floor");
    return { success: true };
}

/**
 * オーダーを削除
 */
export async function deleteOrder(orderId: string) {
    const supabase = await createServerClient() as any;

    if (!orderId || typeof orderId !== 'string') {
        throw new Error("Invalid order ID");
    }

    // 削除前に注文情報を取得して在庫を戻す
    const { data: order } = await supabase
        .from("orders")
        .select("menu_id, quantity")
        .eq("id", orderId)
        .single();

    if (order?.menu_id) {
        const { data: menu } = await supabase
            .from("menus")
            .select("stock_enabled, stock_quantity")
            .eq("id", order.menu_id)
            .single();

        if (menu?.stock_enabled) {
            const newQuantity = menu.stock_quantity + order.quantity;
            await supabase
                .from("menus")
                .update({ stock_quantity: newQuantity })
                .eq("id", order.menu_id);
        }
    }

    const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

    if (error) throw error;
    revalidatePath("/app/slips");
    revalidatePath("/app/floor");
    revalidatePath("/app/menus");
    return { success: true };
}

/**
 * 同じ名前のオーダーを削除
 */
export async function deleteOrdersByName(sessionId: string, orderName: string) {
    const supabase = await createServerClient() as any;

    if (!sessionId || typeof sessionId !== 'string') {
        throw new Error("Invalid session ID");
    }

    const { error } = await supabase
        .from("orders")
        .delete()
        .eq("table_session_id", sessionId)
        .eq("item_name", orderName);

    if (error) throw error;
    revalidatePath("/app/slips");
    revalidatePath("/app/floor");
    return { success: true };
}

/**
 * セッションのオーダー一覧を取得（特別料金を除く）
 */
export async function getSessionOrders(sessionId: string): Promise<OrderData[]> {
    const supabase = await createServerClient() as any;

    const { data: orders, error } = await supabase
        .from("orders")
        .select(`
            *,
            menu:menus(name, price),
            cast:profiles!orders_cast_id_fkey(display_name),
            guest:profiles!orders_guest_id_fkey(display_name)
        `)
        .eq("table_session_id", sessionId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching session orders:", error);
        return [];
    }

    // 特別料金を除外
    const filteredOrders = orders.filter((order: OrderData) => {
        if (order.menu_id) return true;
        if (order.item_name && SPECIAL_FEE_NAME_VALUES.includes(order.item_name)) {
            return false;
        }
        return true;
    });

    return filteredOrders;
}

/**
 * セッションのキャスト関連オーダーを取得
 */
export async function getSessionCastOrdersV2(sessionId: string) {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("orders")
        .select(`
            *,
            profiles:cast_id(*),
            guest_profiles:guest_id(*)
        `)
        .eq("table_session_id", sessionId)
        .not("cast_id", "is", null);

    if (error) {
        console.error("Error fetching cast orders:", error);
        return [];
    }

    return data || [];
}
