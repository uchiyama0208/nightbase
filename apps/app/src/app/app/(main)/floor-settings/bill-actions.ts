"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { BillSettings } from "@/types/floor";
import { revalidatePath } from "next/cache";

export async function getBillSettings() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile?.store_id) throw new Error("No store found");

    const { data, error } = await supabase
        .from("bill_settings")
        .select("*")
        .eq("store_id", profile.store_id)
        .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"

    // Return defaults if no settings exist yet
    if (!data) {
        return {
            store_id: profile.store_id,
            hourly_charge: 3000,
            set_duration_minutes: 60,
            extension_fee_30m: 1500,
            extension_fee_60m: 3000,
            shime_fee: 2000,
            jounai_fee: 1000,
            tax_rate: 0.10,
            service_rate: 0.10,
        } as BillSettings;
    }

    return data as BillSettings;
}

export async function updateBillSettings(settings: Partial<BillSettings>) {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile?.store_id) throw new Error("No store found");

    const { error } = await supabase
        .from("bill_settings")
        .upsert({
            store_id: profile.store_id,
            ...settings,
            updated_at: new Date().toISOString()
        });

    if (error) throw error;
    revalidatePath("/app/floor-settings");
    return { success: true };
}
