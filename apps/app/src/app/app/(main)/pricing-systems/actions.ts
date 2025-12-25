"use server";

import { getAuthContext } from "@/lib/auth-helpers";
import { PricingSystem } from "@/types/floor";
import { revalidatePath } from "next/cache";
import type { PricingSystemCreatePayload, PricingSystemUpdatePayload } from "./types";

// 型の再エクスポート
export type { PricingSystem } from "@/types/floor";

// ============================================
// 料金システム取得
// ============================================

/**
 * 店舗の料金システム一覧を取得
 */
export async function getPricingSystems(): Promise<PricingSystem[]> {
    try {
        const { supabase, storeId } = await getAuthContext();

        const { data, error } = await supabase
            .from("pricing_systems")
            .select("*")
            .eq("store_id", storeId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching pricing systems:", error);
            return [];
        }

        return data as PricingSystem[];
    } catch {
        return [];
    }
}

// ============================================
// 料金システム作成・更新・削除
// ============================================

/**
 * 料金システムを新規作成
 */
export async function createPricingSystem(
    data: PricingSystemCreatePayload
): Promise<PricingSystem> {
    const { supabase, storeId } = await getAuthContext();

    // デフォルトに設定する場合、他のデフォルトを解除
    if (data.is_default) {
        await supabase
            .from("pricing_systems")
            .update({ is_default: false })
            .eq("store_id", storeId);
    }

    const { data: result, error } = await supabase
        .from("pricing_systems")
        .insert({
            ...data,
            store_id: storeId,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating pricing system:", error);
        throw new Error("Failed to create pricing system");
    }

    revalidatePath("/app/pricing-systems");
    return result as PricingSystem;
}

/**
 * 料金システムを更新
 */
export async function updatePricingSystem(
    id: string,
    data: PricingSystemUpdatePayload
): Promise<PricingSystem> {
    const { supabase, storeId } = await getAuthContext();

    // デフォルトに設定する場合、他のデフォルトを解除
    if (data.is_default) {
        await supabase
            .from("pricing_systems")
            .update({ is_default: false })
            .eq("store_id", storeId);
    }

    const { data: result, error } = await supabase
        .from("pricing_systems")
        .update({
            ...data,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("Error updating pricing system:", error);
        throw new Error("Failed to update pricing system");
    }

    revalidatePath("/app/pricing-systems");
    return result as PricingSystem;
}

/**
 * 料金システムを削除
 */
export async function deletePricingSystem(id: string): Promise<{ success: boolean }> {
    const { supabase } = await getAuthContext();

    const { error } = await supabase
        .from("pricing_systems")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting pricing system:", error);
        throw new Error("Failed to delete pricing system");
    }

    revalidatePath("/app/pricing-systems");
    return { success: true };
}

/**
 * 指定した料金システムをデフォルトに設定
 */
export async function setDefaultPricingSystem(id: string): Promise<{ success: boolean }> {
    const { supabase, storeId } = await getAuthContext();

    // 全てのデフォルトを解除
    await supabase
        .from("pricing_systems")
        .update({ is_default: false })
        .eq("store_id", storeId);

    // 新しいデフォルトを設定
    const { error } = await supabase
        .from("pricing_systems")
        .update({ is_default: true })
        .eq("id", id);

    if (error) {
        console.error("Error setting default pricing system:", error);
        throw new Error("Failed to set default pricing system");
    }

    revalidatePath("/app/pricing-systems");
    return { success: true };
}

/**
 * ページデータを取得（SPA用）
 */
export async function getPricingSystemsPageData() {
    const systems = await getPricingSystems();
    return { data: { systems } };
}
