"use server";

import { getAuthContext, getAuthContextForPage } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

export interface TableForQR {
    id: string;
    name: string;
}

export interface StoreOrderSettings {
    tablet_order_enabled: boolean;
    qr_order_enabled: boolean;
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

// 店舗の注文設定を取得
export async function getStoreSettings(): Promise<StoreOrderSettings | null> {
    try {
        const { supabase, storeId } = await getAuthContext();

        const { data, error } = await supabase
            .from("stores")
            .select("tablet_order_enabled, qr_order_enabled")
            .eq("id", storeId)
            .single();

        if (error) {
            console.error("Error fetching store settings:", error);
            return null;
        }

        return data;
    } catch {
        return null;
    }
}

// 店舗の注文設定を更新
export async function updateStoreOrderSettings(settings: Partial<StoreOrderSettings>): Promise<boolean> {
    try {
        const { supabase, storeId } = await getAuthContext();

        const { error } = await supabase
            .from("stores")
            .update(settings)
            .eq("id", storeId);

        if (error) {
            console.error("Error updating store settings:", error);
            return false;
        }

        revalidatePath("/app/settings/table-order");
        return true;
    } catch {
        return false;
    }
}

// ページデータ取得
export async function getTableOrderPageData() {
    const authResult = await getAuthContextForPage();
    if ("redirect" in authResult) {
        return { redirect: authResult.redirect };
    }

    const { context } = authResult;
    const supabase = context.supabase;
    const storeId = context.storeId;

    // テーブル一覧を取得
    const { data: tables } = await supabase
        .from("tables")
        .select("id, name")
        .eq("store_id", storeId)
        .order("name", { ascending: true });

    // 店舗の注文設定を取得
    const { data: storeSettings } = await supabase
        .from("stores")
        .select("tablet_order_enabled, qr_order_enabled")
        .eq("id", storeId)
        .single();

    return {
        data: {
            tables: (tables || []) as TableForQR[],
            storeId,
            tabletOrderEnabled: storeSettings?.tablet_order_enabled ?? false,
            qrOrderEnabled: storeSettings?.qr_order_enabled ?? false,
        },
    };
}
