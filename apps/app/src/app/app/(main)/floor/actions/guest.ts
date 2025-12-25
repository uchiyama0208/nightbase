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

        // ゲストの場合、全ゲストを表示（is_temporaryは廃止済み）

        const { data: profiles, error } = await query.order("display_name", { ascending: true });

        if (error) {
            console.error(`Error fetching ${role}s:`, error);
            return [];
        }

        return profiles || [];
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

    // guest_idがNULLの場合はguest_nameを使用した仮想プロファイルを作成
    return (data || []).map((item: any) => {
        if (!item.guest_id && item.guest_name) {
            return {
                ...item,
                profiles: {
                    id: item.id, // session_guestsのIDを使用
                    display_name: item.guest_name,
                    role: "guest",
                }
            };
        }
        return item;
    });
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
 * guestIdはprofiles.idまたはsession_guests.id（名前だけのゲストの場合）
 */
export async function removeGuestFromSessionV2(sessionId: string, guestId: string) {
    const supabase = await createServerClient() as any;

    // まずguest_idで検索してsession_guestsレコードを取得
    let { data: sessionGuest } = await supabase
        .from("session_guests")
        .select("id, guest_id, session_guest_id")
        .eq("table_session_id", sessionId)
        .eq("guest_id", guestId)
        .single();

    // guest_idで見つからなければ、session_guests.idとして検索
    if (!sessionGuest) {
        const result = await supabase
            .from("session_guests")
            .select("id, guest_id")
            .eq("id", guestId)
            .single();
        sessionGuest = result.data;
    }

    if (!sessionGuest) {
        console.error("Session guest not found");
        return;
    }

    // session_guestsから削除
    const { error } = await supabase
        .from("session_guests")
        .delete()
        .eq("id", sessionGuest.id);

    if (error) {
        console.error("Error removing guest:", error);
        throw error;
    }

    // このゲストに紐づくキャスト料金、セット料金、ステータスオーダーも削除
    // guest_idまたはsession_guest_idで紐づいているものを削除
    if (sessionGuest.guest_id) {
        await supabase
            .from("orders")
            .delete()
            .eq("table_session_id", sessionId)
            .eq("guest_id", sessionGuest.guest_id)
            .in("item_name", ['指名料', '同伴料', '場内料金', 'セット料金', '待機', '接客中', '終了', '延長料金']);
    }

    // session_guest_idで紐づいているものも削除（名前だけのゲスト用）
    await supabase
        .from("orders")
        .delete()
        .eq("table_session_id", sessionId)
        .eq("session_guest_id", sessionGuest.id)
        .in("item_name", ['指名料', '同伴料', '場内料金', 'セット料金', '待機', '接客中', '終了', '延長料金']);

    // guest_countを更新
    await updateSessionGuestCount(supabase, sessionId);

    revalidateFloorAndSlips();
}

/**
 * セッションゲストを別のゲストに変更
 * sessionGuestId: 変更対象のsession_guests.id
 * newGuestId: 新しいprofiles.id（nullの場合は名前だけに変更）
 * newGuestName: 新しいゲスト名（newGuestIdがnullの場合に使用）
 */
export async function changeSessionGuest(
    sessionGuestId: string,
    newGuestId: string | null,
    newGuestName?: string
) {
    const supabase = await createServerClient() as any;

    // 現在のセッションゲストを取得
    const { data: currentGuest, error: fetchError } = await supabase
        .from("session_guests")
        .select("table_session_id, guest_id")
        .eq("id", sessionGuestId)
        .single();

    if (fetchError || !currentGuest) {
        throw new Error("Session guest not found");
    }

    // session_guestsを更新
    const { error: updateError } = await supabase
        .from("session_guests")
        .update({
            guest_id: newGuestId,
            guest_name: newGuestId ? null : (newGuestName || null),
        })
        .eq("id", sessionGuestId);

    if (updateError) {
        console.error("Error changing guest:", updateError);
        throw updateError;
    }

    // 関連するordersのguest_idも更新
    if (currentGuest.guest_id) {
        // 古いゲストIDに紐づくordersを新しいゲストIDに更新
        await supabase
            .from("orders")
            .update({ guest_id: newGuestId })
            .eq("table_session_id", currentGuest.table_session_id)
            .eq("guest_id", currentGuest.guest_id);
    }

    // session_guest_idで紐づいているordersも更新
    await supabase
        .from("orders")
        .update({ guest_id: newGuestId })
        .eq("session_guest_id", sessionGuestId);

    revalidateFloorAndSlips();
}

/**
 * ゲスト名でセッションに追加（profilesにレコードを作成しない）
 */
export async function addGuestByName(sessionId: string, guestName?: string): Promise<{ id: string; display_name: string }> {
    const supabase = await createServerClient() as any;

    // 現在のゲスト数を取得して連番を生成
    const { data: guestCount } = await supabase
        .from("session_guests")
        .select("id", { count: "exact" })
        .eq("table_session_id", sessionId);

    const guestNumber = (guestCount?.length || 0) + 1;
    const displayName = guestName || `ゲスト${guestNumber}`;

    // session_guestsに直接追加（guest_idはNULL）
    const { data: sessionGuest, error } = await supabase
        .from("session_guests")
        .insert({
            table_session_id: sessionId,
            guest_id: null,
            guest_name: displayName,
        })
        .select()
        .single();

    if (error) {
        console.error("Error adding guest by name:", error);
        throw error;
    }

    // guest_countを更新
    await updateSessionGuestCount(supabase, sessionId);

    // セット料金を作成
    await createSetFeeForGuestBySessionGuestId(supabase, sessionId, sessionGuest.id);

    revalidateFloorAndSlips();

    return {
        id: sessionGuest.id,
        display_name: displayName,
    };
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
 * ゲストにセット料金を作成（guest_idを使用）
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

/**
 * セッションゲストIDでセット料金を作成（名前だけのゲスト用）
 */
async function createSetFeeForGuestBySessionGuestId(supabase: any, sessionId: string, sessionGuestId: string) {
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
            guest_id: null,
            session_guest_id: sessionGuestId,
        });
}

/**
 * Update guest grid position
 */
export async function updateGuestGridPosition(
    sessionGuestId: string,
    gridX: number | null,
    gridY: number | null
) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("session_guests")
        .update({ grid_x: gridX, grid_y: gridY })
        .eq("id", sessionGuestId);

    if (error) {
        console.error("Error updating guest grid position:", error);
        throw error;
    }

    revalidateFloorAndSlips();
}

/**
 * Update cast grid position (updates the first order with cast_id)
 */
export async function updateCastGridPosition(
    sessionId: string,
    castId: string,
    gridX: number | null,
    gridY: number | null
) {
    const supabase = await createServerClient() as any;

    console.log("updateCastGridPosition called:", { sessionId, castId, gridX, gridY });

    // Get the first order with this cast_id
    const { data: orders, error: fetchError } = await supabase
        .from("orders")
        .select("id")
        .eq("table_session_id", sessionId)
        .eq("cast_id", castId)
        .order("created_at", { ascending: true })
        .limit(1);

    console.log("Found orders:", orders, "Error:", fetchError);

    if (!orders || orders.length === 0) {
        console.error("No order found for cast:", { sessionId, castId });
        return;
    }

    const { error } = await supabase
        .from("orders")
        .update({ grid_x: gridX, grid_y: gridY })
        .eq("id", orders[0].id);

    if (error) {
        console.error("Error updating cast grid position:", error);
        throw error;
    }

    revalidateFloorAndSlips();
}
