"use server";

import { getAuthContext } from "@/lib/auth-helpers";

export interface TableForQR {
    id: string;
    name: string;
}

// 店舗の全ての卓を取得
export async function getTablesForQR(): Promise<TableForQR[]> {
    try {
        const { supabase, storeId } = await getAuthContext();

        const { data, error } = await supabase
            .from("tables")
            .select("id, name")
            .eq("store_id", storeId)
            .order("name", { ascending: true });

        if (error) {
            console.error("Error fetching tables:", error);
            return [];
        }

        return data || [];
    } catch {
        return [];
    }
}

// 店舗IDを取得
export async function getStoreId(): Promise<string | null> {
    try {
        const { storeId } = await getAuthContext();
        return storeId;
    } catch {
        return null;
    }
}
