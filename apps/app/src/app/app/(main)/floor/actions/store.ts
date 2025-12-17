"use server";

import { createServerClient } from "@/lib/supabaseServerClient";

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
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // ユーザーの所属店舗を取得
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) return null;

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .single();

    if (!profile?.store_id) return null;

    const { data: storeSettings } = await supabase
        .from("store_settings")
        .select("day_switch_time, slip_rounding_enabled, slip_rounding_method, slip_rounding_unit")
        .eq("store_id", profile.store_id)
        .single();

    return storeSettings;
}
