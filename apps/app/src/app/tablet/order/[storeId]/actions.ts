"use server";

import { createClient } from "@supabase/supabase-js";

// 認証不要のSupabaseクライアント
function getPublicSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

export interface StoreInfo {
    id: string;
    name: string;
    tablet_order_enabled: boolean;
}

export interface TableInfo {
    id: string;
    name: string;
    store_id: string;
    has_active_session: boolean;
}

// 店舗情報を取得
export async function getStoreInfo(storeId: string): Promise<StoreInfo | null> {
    const supabase = getPublicSupabase();

    const { data, error } = await supabase
        .from("stores")
        .select("id, name, tablet_order_enabled")
        .eq("id", storeId)
        .single();

    if (error || !data) {
        console.error("Error fetching store:", error);
        return null;
    }

    return data;
}

// 店舗の全テーブルを取得（アクティブセッションの有無も含む）
export async function getTables(storeId: string): Promise<TableInfo[]> {
    const supabase = getPublicSupabase();

    // テーブル一覧を取得
    const { data: tables, error: tablesError } = await supabase
        .from("tables")
        .select("id, name, store_id")
        .eq("store_id", storeId)
        .order("name", { ascending: true });

    if (tablesError || !tables) {
        console.error("Error fetching tables:", tablesError);
        return [];
    }

    // アクティブなセッションを持つテーブルを取得
    const { data: sessions, error: sessionsError } = await supabase
        .from("table_sessions")
        .select("table_id")
        .eq("store_id", storeId)
        .eq("status", "active");

    if (sessionsError) {
        console.error("Error fetching sessions:", sessionsError);
    }

    const activeTableIds = new Set(sessions?.map(s => s.table_id) || []);

    return tables.map(table => ({
        ...table,
        has_active_session: activeTableIds.has(table.id),
    }));
}
