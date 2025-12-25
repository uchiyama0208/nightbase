"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { getAuthContextForPage } from "@/lib/auth-helpers";
import { getAuthenticatedStoreId, revalidateFloorAndSlips } from "./auth";
import type { SessionUpdateData, SessionDataV2 } from "./types";
import { getTables } from "../../seats/actions";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * 新規セッションを作成
 */
export async function createSession(
    tableId?: string | null,
    mainGuestId?: string,
    pricingSystemId?: string
) {
    const { supabase, storeId, role } = await getAuthenticatedStoreId();
    const sb = supabase as any;

    if (role !== "admin" && role !== "staff") {
        throw new Error("権限がありません");
    }

    // デフォルトの料金システムを取得
    let finalPricingSystemId = pricingSystemId;
    if (!finalPricingSystemId) {
        const { data: defaultPricingSystem } = await sb
            .from("pricing_systems")
            .select("id")
            .eq("store_id", storeId)
            .eq("is_default", true)
            .single();

        if (defaultPricingSystem) {
            finalPricingSystemId = defaultPricingSystem.id;
        }
    }

    const { data, error } = await sb
        .from("table_sessions")
        .insert({
            store_id: storeId,
            table_id: tableId || null,
            guest_count: 0,
            main_guest_id: mainGuestId,
            pricing_system_id: finalPricingSystemId || null,
            status: 'active'
        })
        .select()
        .single();

    if (error) throw error;

    revalidateFloorAndSlips();
    return data;
}

/**
 * セッションを更新
 */
export async function updateSession(
    sessionId: string,
    updates: SessionUpdateData
) {
    const { supabase, storeId, role } = await getAuthenticatedStoreId();
    const sb = supabase as any;

    if (role !== "admin" && role !== "staff") {
        throw new Error("権限がありません");
    }

    // セッションの店舗を確認
    const { data: session } = await sb
        .from("table_sessions")
        .select("store_id")
        .eq("id", sessionId)
        .maybeSingle();

    if (!session || session.store_id !== storeId) {
        throw new Error("Invalid session");
    }

    const dbUpdates: Record<string, unknown> = {};
    if (updates.tableId !== undefined) dbUpdates.table_id = updates.tableId;
    if (updates.guestCount !== undefined) dbUpdates.guest_count = updates.guestCount;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    if (updates.pricingSystemId !== undefined) dbUpdates.pricing_system_id = updates.pricingSystemId;
    if (updates.mainGuestId !== undefined) dbUpdates.main_guest_id = updates.mainGuestId;

    const { error } = await sb
        .from("table_sessions")
        .update(dbUpdates)
        .eq("id", sessionId);

    if (error) throw error;
    revalidateFloorAndSlips();
    return { success: true };
}

/**
 * セッションの時間を更新
 */
export async function updateSessionTimes(
    sessionId: string,
    startTime?: string,
    endTime?: string | null
) {
    const { supabase, storeId, role } = await getAuthenticatedStoreId();
    const sb = supabase as any;

    if (role !== "admin" && role !== "staff") {
        throw new Error("権限がありません");
    }

    // セッションの店舗を確認
    const { data: session } = await sb
        .from("table_sessions")
        .select("store_id")
        .eq("id", sessionId)
        .maybeSingle();

    if (!session || session.store_id !== storeId) {
        throw new Error("Invalid session");
    }

    const updates: Record<string, unknown> = {};
    if (startTime !== undefined) updates.start_time = startTime;
    if (endTime !== undefined) updates.end_time = endTime;

    const { error } = await sb
        .from("table_sessions")
        .update(updates)
        .eq("id", sessionId);

    if (error) throw error;
    revalidateFloorAndSlips();
    return { success: true };
}

/**
 * セッションを会計完了にする
 */
export async function checkoutSession(sessionId: string) {
    const { supabase, storeId, role } = await getAuthenticatedStoreId();
    const sb = supabase as any;

    if (role !== "admin" && role !== "staff") {
        throw new Error("権限がありません");
    }

    // セッション情報を取得
    const { data: session } = await sb
        .from("table_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

    if (!session || session.store_id !== storeId) throw new Error("Session not found");

    // 合計金額を計算
    const { data: orders } = await sb
        .from("orders")
        .select("amount")
        .eq("table_session_id", sessionId)
        .neq("status", "cancelled");

    const totalAmount = orders?.reduce((sum: number, order: { amount: number }) =>
        sum + (order.amount || 0), 0) || 0;

    // セッションを完了に更新
    const { error } = await sb
        .from("table_sessions")
        .update({
            status: "completed",
            end_time: new Date().toISOString(),
            total_amount: totalAmount
        })
        .eq("id", sessionId);

    if (error) throw error;

    // 全ての接客中キャストを終了に（cast_idがあるオーダー全て）
    await sb
        .from("orders")
        .update({ cast_status: 'ended', item_name: '終了' })
        .eq("table_session_id", sessionId)
        .not("cast_id", "is", null)
        .neq("cast_status", 'ended');

    revalidateFloorAndSlips();
    return { success: true };
}

/**
 * セッションを閉じる（checkoutSessionのエイリアス）
 */
export async function closeSession(sessionId: string) {
    return checkoutSession(sessionId);
}

/**
 * セッションを再開する
 */
export async function reopenSession(sessionId: string) {
    const { supabase, storeId, role } = await getAuthenticatedStoreId();
    const sb = supabase as any;

    if (role !== "admin" && role !== "staff") {
        throw new Error("権限がありません");
    }

    const { data: session } = await sb
        .from("table_sessions")
        .select("store_id")
        .eq("id", sessionId)
        .maybeSingle();

    if (!session || session.store_id !== storeId) {
        throw new Error("Session not found");
    }

    const { error } = await sb
        .from("table_sessions")
        .update({
            status: "active",
            end_time: null
        })
        .eq("id", sessionId);

    if (error) throw error;

    revalidateFloorAndSlips();
    return { success: true };
}

/**
 * セッションを削除する
 */
export async function deleteSession(sessionId: string) {
    const { supabase, storeId, role } = await getAuthenticatedStoreId();
    const sb = supabase as any;

    if (role !== "admin" && role !== "staff") {
        throw new Error("権限がありません");
    }

    const { data: session } = await sb
        .from("table_sessions")
        .select("store_id")
        .eq("id", sessionId)
        .maybeSingle();

    if (!session || session.store_id !== storeId) {
        throw new Error("Invalid session");
    }

    if (!sessionId || typeof sessionId !== 'string') {
        throw new Error("Invalid session ID");
    }

    // 1. 関連オーダーを削除
    const { error: ordersError } = await sb
        .from("orders")
        .delete()
        .eq("table_session_id", sessionId);

    if (ordersError) throw ordersError;

    // 2. セッションゲストを削除
    const { error: guestsError } = await sb
        .from("session_guests")
        .delete()
        .eq("table_session_id", sessionId);

    if (guestsError) throw guestsError;

    // 3. セッションを削除
    const { error: sessionError } = await sb
        .from("table_sessions")
        .delete()
        .eq("id", sessionId);

    if (sessionError) throw sessionError;

    revalidateFloorAndSlips();
    return { success: true };
}

/**
 * アクティブなセッション一覧を取得（V2）
 */
export async function getActiveSessionsV2(): Promise<SessionDataV2[]> {
    const supabase = await createServerClient();

    const { data: sessions, error } = await supabase
        .from("table_sessions")
        .select(`
            *,
            orders(*, menus(*), profiles!orders_cast_id_fkey(*)),
            session_guests(*, profiles:guest_id(*))
        `)
        .neq("status", "completed");

    if (error) {
        console.error("Error fetching sessions:", error);
        return [];
    }

    return sessions || [];
}

/**
 * 完了済みセッション一覧を取得（V2）
 */
export async function getCompletedSessionsV2(): Promise<SessionDataV2[]> {
    const supabase = await createServerClient();

    const { data: sessions, error } = await supabase
        .from("table_sessions")
        .select(`
            *,
            orders(*, menus(*), profiles!orders_cast_id_fkey(*)),
            session_guests(*, profiles:guest_id(*))
        `)
        .eq("status", "completed")
        .order("end_time", { ascending: false });

    if (error) {
        console.error("Error fetching completed sessions:", error);
        return [];
    }

    return sessions || [];
}

/**
 * 単一セッションを取得（V2）
 */
export async function getSessionByIdV2(sessionId: string): Promise<SessionDataV2 | null> {
    const supabase = await createServerClient();

    const { data: session, error } = await supabase
        .from("table_sessions")
        .select(`
            *,
            orders(*, menus(*), profiles!orders_cast_id_fkey(*)),
            session_guests(*, profiles:guest_id(*))
        `)
        .eq("id", sessionId)
        .single();

    if (error) {
        console.error("Error fetching session:", error);
        return null;
    }

    return session;
}

/**
 * フロアページ用の初期データを取得（クライアントサイドフェッチ用）
 */
export async function getFloorPageData() {
    const result = await getAuthContextForPage({ requireStaff: true });

    if ("redirect" in result) {
        return { redirect: result.redirect };
    }

    const { context } = result;
    const { supabase, storeId, profileId, role } = context;

    // 編集権限チェック
    const canEdit = role === "admin" || role === "staff";

    // ページ権限を取得
    const { data: profileData } = await supabase
        .from("profiles")
        .select("role_id")
        .eq("id", profileId)
        .maybeSingle();

    let permissions: Record<string, string> | null = null;
    if (profileData?.role_id) {
        const { data: storeRole } = await supabase
            .from("store_roles")
            .select("permissions")
            .eq("id", profileData.role_id)
            .maybeSingle();
        permissions = storeRole?.permissions || null;
    }

    const checkPermission = (pageKey: string) => {
        if (role === "admin") return true;
        if (!permissions) return role === "staff";
        const level = permissions[pageKey];
        return level === "view" || level === "edit";
    };

    const pagePermissions = {
        bottles: checkPermission("bottles"),
        resumes: checkPermission("resumes"),
        salarySystems: checkPermission("salary-systems"),
        attendance: checkPermission("attendance"),
        personalInfo: checkPermission("users-personal-info"),
    };

    // 初期データを並列取得
    const [initialSessions, initialTables] = await Promise.all([
        getActiveSessionsV2(),
        getTables(),
    ]);

    return {
        data: {
            canEdit,
            pagePermissions,
            initialSessions,
            initialTables,
        }
    };
}
