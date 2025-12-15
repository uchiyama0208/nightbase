"use server";

import { createClient } from "@supabase/supabase-js";

// 認証不要のSupabaseクライアント
function getPublicSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

export interface MenuItem {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    category_id: string;
    is_hidden: boolean;
}

export interface MenuCategory {
    id: string;
    name: string;
    sort_order: number;
}

export interface TableInfo {
    id: string;
    name: string;
    store_id: string;
}

export interface StoreInfo {
    id: string;
    name: string;
}

export interface ActiveSession {
    id: string;
    status: string;
}

// 店舗情報を取得
export async function getStoreInfo(storeId: string): Promise<StoreInfo | null> {
    const supabase = getPublicSupabase();

    const { data, error } = await supabase
        .from("stores")
        .select("id, name")
        .eq("id", storeId)
        .single();

    if (error || !data) {
        console.error("Error fetching store:", error);
        return null;
    }

    return data;
}

// 卓情報を取得
export async function getTableInfo(tableId: string, storeId: string): Promise<TableInfo | null> {
    const supabase = getPublicSupabase();

    const { data, error } = await supabase
        .from("tables")
        .select("id, name, store_id")
        .eq("id", tableId)
        .eq("store_id", storeId)
        .single();

    if (error || !data) {
        console.error("Error fetching table:", error);
        return null;
    }

    return data;
}

// アクティブなセッションを取得
export async function getActiveSession(tableId: string): Promise<ActiveSession | null> {
    const supabase = getPublicSupabase();

    const { data, error } = await supabase
        .from("table_sessions")
        .select("id, status")
        .eq("table_id", tableId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (error || !data) {
        return null;
    }

    return data;
}

// メニューカテゴリを取得
export async function getMenuCategories(storeId: string): Promise<MenuCategory[]> {
    const supabase = getPublicSupabase();

    const { data, error } = await supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("Error fetching categories:", error);
        return [];
    }

    return data || [];
}

// メニューを取得（非表示を除く）
export async function getMenus(storeId: string): Promise<MenuItem[]> {
    const supabase = getPublicSupabase();

    const { data, error } = await supabase
        .from("menus")
        .select("id, name, price, image_url, category_id, is_hidden")
        .eq("store_id", storeId)
        .eq("is_hidden", false)
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching menus:", error);
        return [];
    }

    return data || [];
}

// 注文を作成
export async function createOrder(
    sessionId: string,
    menuId: string,
    itemName: string,
    quantity: number,
    amount: number
): Promise<{ success: boolean; error?: string }> {
    const supabase = getPublicSupabase();

    const { error } = await supabase
        .from("orders")
        .insert({
            table_session_id: sessionId,
            menu_id: menuId,
            item_name: itemName,
            quantity,
            amount,
            status: "pending",
        });

    if (error) {
        console.error("Error creating order:", error);
        return { success: false, error: "注文の作成に失敗しました" };
    }

    return { success: true };
}

// 複数の注文を一括作成
export async function createOrders(
    sessionId: string,
    items: { menuId: string; itemName: string; quantity: number; amount: number }[]
): Promise<{ success: boolean; error?: string }> {
    const supabase = getPublicSupabase();

    const orders = items.map(item => ({
        table_session_id: sessionId,
        menu_id: item.menuId,
        item_name: item.itemName,
        quantity: item.quantity,
        amount: item.amount,
        status: "pending",
    }));

    const { error } = await supabase
        .from("orders")
        .insert(orders);

    if (error) {
        console.error("Error creating orders:", error);
        return { success: false, error: "注文の作成に失敗しました" };
    }

    return { success: true };
}

// 呼び出しを作成
export async function createTableCall(
    storeId: string,
    tableId: string,
    sessionId: string | null
): Promise<{ success: boolean; error?: string }> {
    const supabase = getPublicSupabase();

    const { error } = await supabase
        .from("table_calls")
        .insert({
            store_id: storeId,
            table_id: tableId,
            table_session_id: sessionId,
            status: "pending",
        });

    if (error) {
        console.error("Error creating table call:", error);
        return { success: false, error: "呼び出しに失敗しました" };
    }

    return { success: true };
}

// 注文履歴を取得（セッション内）
export async function getSessionOrders(sessionId: string): Promise<{
    id: string;
    item_name: string;
    quantity: number;
    amount: number;
    status: string;
    created_at: string;
}[]> {
    const supabase = getPublicSupabase();

    const { data, error } = await supabase
        .from("orders")
        .select("id, item_name, quantity, amount, status, created_at")
        .eq("table_session_id", sessionId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching session orders:", error);
        return [];
    }

    return data || [];
}
