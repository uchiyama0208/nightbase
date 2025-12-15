"use server";

import { getAuthContext } from "@/lib/auth-helpers";
import { BillSettings } from "@/types/floor";
import { revalidatePath } from "next/cache";

/**
 * 伝票設定を取得
 */
export async function getBillSettings(): Promise<BillSettings | null> {
    try {
        const { supabase, storeId } = await getAuthContext();

        const { data, error } = await supabase
            .from("bill_settings")
            .select("*")
            .eq("store_id", storeId)
            .single();

        if (error) {
            console.error("Error fetching bill settings:", error);
            return null;
        }

        return data as BillSettings;
    } catch {
        return null;
    }
}

/**
 * 伝票設定を保存
 */
export async function saveBillSettings(
    settings: Partial<BillSettings>
): Promise<BillSettings> {
    const { supabase, storeId } = await getAuthContext();

    const { data, error } = await supabase
        .from("bill_settings")
        .upsert({
            ...settings,
            store_id: storeId,
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
