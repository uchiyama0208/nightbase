"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

// Supabaseクライアントの型（動的なためany使用）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

/**
 * 認証済みユーザーのstore_idを取得
 * @throws Error if not authenticated or no store found
 */
export async function getAuthenticatedStoreId(): Promise<{
    supabase: SupabaseClient;
    storeId: string;
    userId: string;
}> {
    const supabase = await createServerClient() as SupabaseClient;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile?.store_id) throw new Error("No store found");

    return { supabase, storeId: profile.store_id, userId: user.id };
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
