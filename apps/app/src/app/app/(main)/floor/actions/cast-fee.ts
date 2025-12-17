"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidateFloorAndSlips } from "./auth";
import { getCastFeeItemName, type CastFeeType, type PricingSystemData } from "./types";

/**
 * キャスト料金を追加（指名/場内/同伴タグ設定時）
 */
export async function addCastFeeV2(
    sessionId: string,
    castId: string,
    guestId: string,
    feeType: CastFeeType,
    pricingSystemId?: string,
    initialStatus: string = 'serving'
) {
    const supabase = await createServerClient() as any;

    const isWaiting = initialStatus === 'waiting';

    // セッションからstore_idを取得
    const { data: session } = await supabase
        .from("table_sessions")
        .select("store_id")
        .eq("id", sessionId)
        .single();

    // 料金システムを取得
    let pricingSystem: PricingSystemData | null = null;
    if (pricingSystemId && !isWaiting) {
        const { data } = await supabase
            .from("pricing_systems")
            .select("*")
            .eq("id", pricingSystemId)
            .single();
        pricingSystem = data;
    }

    // 金額とセット時間を決定
    const { amount, setDurationMinutes } = calculateCastFee(feeType, pricingSystem, isWaiting);

    // 開始/終了時間を設定
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + setDurationMinutes * 60 * 1000);

    // オーダーを作成
    const { data, error } = await supabase
        .from("orders")
        .insert({
            table_session_id: sessionId,
            store_id: session?.store_id,
            menu_id: null,
            item_name: isWaiting ? '' : getCastFeeItemName(feeType),
            quantity: 1,
            amount: isWaiting ? 0 : amount,
            cast_id: castId,
            guest_id: guestId,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            cast_status: initialStatus,
        })
        .select()
        .single();

    if (error) {
        console.error("Error adding cast fee:", error);
        throw error;
    }

    revalidateFloorAndSlips();
    return data;
}

/**
 * キャストのステータスを変更（waiting/serving/ended）
 */
export async function updateCastFeeStatusV2(orderId: string, status: string) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("orders")
        .update({
            cast_status: status,
            item_name: '',
            amount: 0,
        })
        .eq("id", orderId);

    if (error) {
        console.error("Error updating cast status:", error);
        throw error;
    }

    revalidateFloorAndSlips();
}

/**
 * タグを料金タイプに変更（既存オーダーを更新）
 */
export async function updateCastTagToFeeType(
    orderId: string,
    feeType: CastFeeType,
    pricingSystemId?: string
) {
    const supabase = await createServerClient() as any;

    // 料金システムを取得
    let pricingSystem: PricingSystemData | null = null;
    if (pricingSystemId) {
        const { data } = await supabase
            .from("pricing_systems")
            .select("*")
            .eq("id", pricingSystemId)
            .single();
        pricingSystem = data;
    }

    // 料金タイプに応じた値を決定
    const { itemName, amount } = getFeeTypeDetails(feeType, pricingSystem);

    const { error } = await supabase
        .from("orders")
        .update({
            cast_status: feeType,
            item_name: itemName,
            amount: amount,
        })
        .eq("id", orderId);

    if (error) {
        console.error("Error updating cast tag to fee type:", error);
        throw error;
    }

    revalidateFloorAndSlips();
}

/**
 * キャスト料金のタイプを変更（指名→場内など）
 */
export async function changeCastFeeTypeV2(
    orderId: string,
    newFeeType: CastFeeType,
    pricingSystemId?: string
) {
    const supabase = await createServerClient() as any;

    // 既存オーダーを取得
    const { data: existingOrder, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

    if (fetchError || !existingOrder) {
        console.error("Error fetching order:", fetchError);
        throw fetchError;
    }

    const now = new Date();

    // 現在のオーダーを終了
    await supabase
        .from("orders")
        .update({
            end_time: now.toISOString(),
            cast_status: 'ended'
        })
        .eq("id", orderId);

    // 料金システムを取得
    let pricingSystem: PricingSystemData | null = null;
    if (pricingSystemId) {
        const { data } = await supabase
            .from("pricing_systems")
            .select("*")
            .eq("id", pricingSystemId)
            .single();
        pricingSystem = data;
    }

    // 新しい料金タイプの値を取得
    const { amount, setDurationMinutes } = calculateCastFee(newFeeType, pricingSystem, false);
    const endTime = new Date(now.getTime() + setDurationMinutes * 60 * 1000);

    // 新しいオーダーを作成
    const { error: insertError } = await supabase
        .from("orders")
        .insert({
            table_session_id: existingOrder.table_session_id,
            store_id: existingOrder.store_id,
            menu_id: null,
            item_name: getCastFeeItemName(newFeeType),
            quantity: 1,
            amount: amount,
            cast_id: existingOrder.cast_id,
            guest_id: existingOrder.guest_id,
            start_time: now.toISOString(),
            end_time: endTime.toISOString(),
            cast_status: newFeeType,
        });

    if (insertError) {
        console.error("Error creating new cast fee:", insertError);
        throw insertError;
    }

    revalidateFloorAndSlips();
}

/**
 * キャスト料金を削除
 */
export async function removeCastFeeV2(orderId: string) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

    if (error) {
        console.error("Error removing cast fee:", error);
        throw error;
    }

    revalidateFloorAndSlips();
}

/**
 * キャスト料金の時間を更新
 */
export async function updateCastFeeTimesV2(
    orderId: string,
    startTime?: string,
    endTime?: string | null
) {
    const supabase = await createServerClient() as any;

    const updateData: Record<string, unknown> = {};
    if (startTime !== undefined) updateData.start_time = startTime;
    if (endTime !== undefined) updateData.end_time = endTime;

    const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

    if (error) {
        console.error("Error updating cast fee times:", error);
        throw error;
    }

    revalidateFloorAndSlips();
}

// ============================================
// ヘルパー関数（内部使用）
// ============================================

/**
 * キャスト料金と期間を計算
 */
function calculateCastFee(
    feeType: CastFeeType,
    pricingSystem: PricingSystemData | null,
    isWaiting: boolean
): { amount: number; setDurationMinutes: number } {
    if (!pricingSystem || isWaiting) {
        return { amount: 0, setDurationMinutes: 60 };
    }

    switch (feeType) {
        case 'nomination':
            return {
                amount: pricingSystem.nomination_fee || 0,
                setDurationMinutes: pricingSystem.nomination_set_duration_minutes || 60,
            };
        case 'douhan':
            return {
                amount: pricingSystem.douhan_fee || 0,
                setDurationMinutes: pricingSystem.douhan_set_duration_minutes || 60,
            };
        case 'companion':
            return {
                amount: pricingSystem.companion_fee || 0,
                setDurationMinutes: pricingSystem.companion_set_duration_minutes || 60,
            };
    }
}

/**
 * 料金タイプの詳細を取得
 */
function getFeeTypeDetails(
    feeType: CastFeeType,
    pricingSystem: PricingSystemData | null
): { itemName: string; amount: number } {
    switch (feeType) {
        case 'nomination':
            return {
                itemName: '指名料',
                amount: pricingSystem?.nomination_fee || 0,
            };
        case 'companion':
            return {
                itemName: '場内料金',
                amount: pricingSystem?.companion_fee || 0,
            };
        case 'douhan':
            return {
                itemName: '同伴料',
                amount: pricingSystem?.douhan_fee || 0,
            };
    }
}
