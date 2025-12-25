"use server";

import { getAuthenticatedStoreId } from "./auth";

interface StoreSettings {
    day_switch_time: string;
    slip_rounding_enabled: boolean;
    slip_rounding_method: string | null;
    slip_rounding_unit: number | null;
}

/**
 * 店舗設定を取得
 */
export async function getStoreSettings(): Promise<StoreSettings | null> {
    try {
        const { supabase, storeId } = await getAuthenticatedStoreId();

        const { data: storeSettings } = await supabase
            .from("store_settings")
            .select("day_switch_time, slip_rounding_enabled, slip_rounding_method, slip_rounding_unit")
            .eq("store_id", storeId)
            .single();

        return storeSettings;
    } catch {
        return null;
    }
}
