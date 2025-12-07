"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { BillSettings } from "@/types/floor";
import { revalidatePath } from "next/cache";

export async function getBillSettings(): Promise<BillSettings | null> {
    const supabase = await createServerClient() as any;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile?.store_id) return null;

    const { data, error } = await supabase
        .from("bill_settings")
        .select("*")
        .eq("store_id", profile.store_id)
        .single();

    if (error) {
        console.error("Error fetching bill settings:", error);
        return null;
    }

    return data as BillSettings;
}

export async function saveBillSettings(settings: Partial<BillSettings>) {
    const supabase = await createServerClient() as any;

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
        .upsert({
            ...settings,
            store_id: profile.store_id,
            updated_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) {
        console.error("Error saving bill settings:", error);
        throw new Error("Failed to save bill settings");
    }

    revalidatePath("/app/settings");
    return data as BillSettings;
}
