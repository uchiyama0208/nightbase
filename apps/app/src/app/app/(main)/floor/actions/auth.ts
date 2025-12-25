"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * 認証済みユーザーのstore_idを取得
 * @throws Error if not authenticated or no store found
 */
export async function getAuthenticatedStoreId(): Promise<{
    supabase: SupabaseClient<Database>;
    storeId: string;
    userId: string;
    role: string;
    profileId: string;
}> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("id, store_id, role")
        .eq("user_id", user.id)
        .single();

    if (!profile?.store_id) throw new Error("No store found");

    return { supabase, storeId: profile.store_id, userId: user.id, role: profile.role, profileId: profile.id };
}

/**
 * パス再検証（floor + slips）
 */
export async function revalidateFloorAndSlips() {
    revalidatePath("/app/floor");
    revalidatePath("/app/slips");
}

/**
 * 現在のユーザーのstoreIdを取得（エラー時はnull）
 */
export async function getCurrentStoreId(): Promise<string | null> {
    try {
        const { storeId } = await getAuthenticatedStoreId();
        return storeId;
    } catch {
        return null;
    }
}
