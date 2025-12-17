"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { getAuthenticatedStoreId, revalidateFloorAndSlips } from "./auth";
import type { ProfileData, SessionGuestData } from "./types";

/**
 * プロファイル一覧を取得（キャスト/ゲスト共通）- 一時ゲストを除外
 */
async function getProfilesByRole(role: "cast" | "guest"): Promise<ProfileData[]> {
    try {
        const { supabase, storeId } = await getAuthenticatedStoreId();
        let query = supabase
            .from("profiles")
            .select("*")
            .eq("store_id", storeId)
            .eq("role", role);

        // キャストの場合は在籍中・体入のみ表示
        if (role === "cast") {
            query = query.in("status", ["在籍中", "体入"]);
        }

        const { data: profiles, error } = await query.order("display_name", { ascending: true });

        if (error) {
            console.error(`Error fetching ${role}s:`, error);
            return [];
        }

        // 一時ゲスト（ゲスト1, ゲスト2...）を除外
        return (profiles || []).filter((p: ProfileData) =>
            !(p.user_id === null && p.display_name?.match(/^ゲスト\d+$/))
        );
    } catch {
        return [];
    }
}

/**
 * キャスト一覧を取得
 */
export async function getCasts(): Promise<ProfileData[]> {
    return getProfilesByRole("cast");
}

/**
 * ゲスト一覧を取得
 */
export async function getGuests(): Promise<ProfileData[]> {
    return getProfilesByRole("guest");
}

/**
 * セッションのゲスト一覧を取得
 */
export async function getSessionGuestsV2(sessionId: string): Promise<SessionGuestData[]> {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("session_guests")
        .select(`
            *,
            profiles:guest_id(*)
        `)
        .eq("table_session_id", sessionId);

    if (error) {
        console.error("Error fetching session guests:", error);
        return [];
    }

    return data || [];
}

/**
 * ゲストをセッションに追加
 */
export async function addGuestToSessionV2(
    sessionId: string,
    guestId: string,
    createSetFee: boolean = true
) {
    const supabase = await createServerClient() as any;

    // session_guestsに追加
    const { error } = await supabase
        .from("session_guests")
        .insert({
            table_session_id: sessionId,
            guest_id: guestId,
        });

    if (error) {
        // すでに存在する場合は無視
        if (error.code !== '23505') {
            console.error("Error adding guest:", error);
            throw error;
        }
    }

    // guest_countを更新
    await updateSessionGuestCount(supabase, sessionId);

    // セット料金を自動作成
    if (createSetFee) {
        await createSetFeeForGuest(supabase, sessionId, guestId);
    }

    revalidateFloorAndSlips();
}

/**
 * ゲストをセッションから削除
 */
export async function removeGuestFromSessionV2(sessionId: string, guestId: string) {
    const supabase = await createServerClient() as any;

    // session_guestsから削除
    const { error } = await supabase
        .from("session_guests")
        .delete()
        .eq("table_session_id", sessionId)
        .eq("guest_id", guestId);

    if (error) {
        console.error("Error removing guest:", error);
        throw error;
    }

    // このゲストに紐づくキャスト料金とセット料金も削除
    await supabase
        .from("orders")
        .delete()
        .eq("table_session_id", sessionId)
        .eq("guest_id", guestId)
        .in("item_name", ['指名料', '同伴料', '場内料金', 'セット料金']);

    // guest_countを更新
    await updateSessionGuestCount(supabase, sessionId);

    revalidateFloorAndSlips();
}

/**
 * 一時ゲストを作成してセッションに追加
 */
export async function createTempGuestV2(sessionId: string): Promise<ProfileData> {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

    if (!profile?.store_id) throw new Error("No store found");

    // 現在のゲスト数を取得して連番を生成
    const { data: guestCount } = await supabase
        .from("session_guests")
        .select("id", { count: "exact" })
        .eq("table_session_id", sessionId);

    const guestNumber = (guestCount?.length || 0) + 1;

    // 一時ゲストプロフィールを作成
    const { data: guestProfile, error: profileError } = await supabase
        .from("profiles")
        .insert({
            store_id: profile.store_id,
            display_name: `ゲスト${guestNumber}`,
            role: "guest",
            is_temporary: true,
        })
        .select()
        .single();

    if (profileError) {
        console.error("Error creating temp guest profile:", profileError);
        throw profileError;
    }

    // session_guestsに追加
    await addGuestToSessionV2(sessionId, guestProfile.id);

    return guestProfile;
}

// ============================================
// ヘルパー関数（内部使用）
// ============================================

/**
 * セッションのゲスト数を更新
 */
async function updateSessionGuestCount(supabase: any, sessionId: string) {
    const { data: guestCount } = await supabase
        .from("session_guests")
        .select("id", { count: "exact" })
        .eq("table_session_id", sessionId);

    await supabase
        .from("table_sessions")
        .update({ guest_count: guestCount?.length || 0 })
        .eq("id", sessionId);
}

/**
 * ゲストにセット料金を作成
 */
async function createSetFeeForGuest(supabase: any, sessionId: string, guestId: string) {
    const { data: session } = await supabase
        .from("table_sessions")
        .select("pricing_system_id, store_id")
        .eq("id", sessionId)
        .single();

    if (!session?.pricing_system_id) return;

    const { data: pricingSystem } = await supabase
        .from("pricing_systems")
        .select("set_fee")
        .eq("id", session.pricing_system_id)
        .single();

    if (!pricingSystem) return;

    await supabase
        .from("orders")
        .insert({
            table_session_id: sessionId,
            store_id: session.store_id,
            item_name: 'セット料金',
            quantity: 1,
            amount: pricingSystem.set_fee || 0,
            cast_id: null,
            guest_id: guestId,
        });
}
