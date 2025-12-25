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
    guestId: string | null,
    feeType: CastFeeType,
    pricingSystemId?: string,
    initialStatus: string = 'serving',
    sessionGuestId?: string
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

    // 既存のアクティブなキャストの終了時間を取得
    const { data: existingCasts } = await supabase
        .from("orders")
        .select("end_time")
        .eq("table_session_id", sessionId)
        .not("cast_id", "is", null)
        .in("cast_status", ["serving", "waiting", "help", "nomination", "companion", "douhan"])
        .order("end_time", { ascending: false })
        .limit(1);

    // 開始時間を決定（既存キャストがいれば、その終了時間を使用）
    let startTime: Date;
    if (existingCasts && existingCasts.length > 0 && existingCasts[0].end_time) {
        startTime = new Date(existingCasts[0].end_time);
    } else {
        startTime = new Date();
    }
    const endTime = new Date(startTime.getTime() + setDurationMinutes * 60 * 1000);

    // オーダーを作成
    const { data, error } = await supabase
        .from("orders")
        .insert({
            table_session_id: sessionId,
            store_id: session?.store_id,
            menu_id: null,
            item_name: isWaiting ? '待機' : getCastFeeItemName(feeType),
            quantity: 1,
            amount: isWaiting ? 0 : amount,
            cast_id: castId,
            guest_id: guestId,
            session_guest_id: sessionGuestId || null,
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
 * キャストのステータスを変更（waiting/serving/help/ended）
 */
export async function updateCastFeeStatusV2(orderId: string, status: string) {
    const supabase = await createServerClient() as any;

    // ステータスに応じたitem_nameを決定
    const getItemName = () => {
        switch (status) {
            case 'waiting': return '待機';
            case 'serving': return '接客中';
            case 'help': return 'ヘルプ';
            case 'ended': return '終了';
            default: return '接客中';
        }
    };
    const itemName = getItemName();

    // 終了の場合はend_timeも設定
    const updateData: Record<string, any> = {
        cast_status: status,
        item_name: itemName,
        amount: 0,
    };
    if (status === 'ended') {
        updateData.end_time = new Date().toISOString();
    }

    const { error } = await supabase
        .from("orders")
        .update(updateData)
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

    // 既存オーダーを取得（相性追加用）
    const { data: existingOrder } = await supabase
        .from("orders")
        .select("cast_id, guest_id")
        .eq("id", orderId)
        .single();

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

    // 指名/同伴の場合、相性データを自動追加
    if ((feeType === 'nomination' || feeType === 'douhan') && existingOrder?.guest_id && existingOrder?.cast_id) {
        await addCompatibilityIfNotExists(supabase, existingOrder.guest_id, existingOrder.cast_id);
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

    // 現在のオーダーを終了（end_timeのみ設定、cast_statusは維持）
    await supabase
        .from("orders")
        .update({
            end_time: now.toISOString(),
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

    // 指名/同伴の場合、相性データを自動追加
    if ((newFeeType === 'nomination' || newFeeType === 'douhan') && existingOrder?.guest_id && existingOrder?.cast_id) {
        await addCompatibilityIfNotExists(supabase, existingOrder.guest_id, existingOrder.cast_id);
    }

    revalidateFloorAndSlips();
}

/**
 * タグ変更時に既存オーダーを終了して新しいオーダーを作成
 * 接客中/終了 ⇔ 指名/場内/同伴 の変更時に使用
 */
export async function changeCastTagWithNewOrder(
    orderId: string,
    newTag: string,
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

    // 新しいタグが料金タイプかどうか判定
    const feeTypes = ['nomination', 'companion', 'douhan'];
    const isFeeType = feeTypes.includes(newTag);

    let itemName: string;
    let amount = 0;
    let endTime: Date;

    if (isFeeType) {
        // 指名/場内/同伴の場合
        const feeType = newTag as CastFeeType;

        // 料金システムIDを決定（パラメータがなければセッションから取得）
        let finalPricingSystemId = pricingSystemId;
        if (!finalPricingSystemId) {
            const { data: session } = await supabase
                .from("table_sessions")
                .select("pricing_system_id")
                .eq("id", existingOrder.table_session_id)
                .single();
            finalPricingSystemId = session?.pricing_system_id;
        }

        // 料金システムを取得
        let pricingSystem: PricingSystemData | null = null;
        if (finalPricingSystemId) {
            const { data } = await supabase
                .from("pricing_systems")
                .select("*")
                .eq("id", finalPricingSystemId)
                .single();
            pricingSystem = data;
        }

        const feeDetails = calculateCastFee(feeType, pricingSystem, false);
        amount = feeDetails.amount;
        const setDurationMinutes = feeDetails.setDurationMinutes;
        endTime = new Date(now.getTime() + setDurationMinutes * 60 * 1000);
        itemName = getCastFeeItemName(feeType);
    } else {
        // 待機/接客中/ヘルプ/終了の場合
        const statusNames: Record<string, string> = {
            waiting: '待機',
            serving: '接客中',
            help: 'ヘルプ',
            ended: '終了',
        };
        itemName = statusNames[newTag] || '接客中';
        // デフォルト20分
        endTime = new Date(now.getTime() + 20 * 60 * 1000);
    }

    // 現在のオーダーを終了
    // 料金タイプへの変更時は cast_status を ended に変更
    const updateData: Record<string, any> = {
        end_time: now.toISOString(),
    };
    if (isFeeType) {
        updateData.cast_status = 'ended';
        updateData.item_name = '終了';
    }
    await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

    // 新しいオーダーを作成
    const { error: insertError } = await supabase
        .from("orders")
        .insert({
            table_session_id: existingOrder.table_session_id,
            store_id: existingOrder.store_id,
            menu_id: null,
            item_name: itemName,
            quantity: 1,
            amount: amount,
            cast_id: existingOrder.cast_id,
            guest_id: existingOrder.guest_id,
            start_time: now.toISOString(),
            end_time: endTime.toISOString(),
            cast_status: newTag,
        });

    if (insertError) {
        console.error("Error creating new cast order:", insertError);
        throw insertError;
    }

    // 指名/同伴の場合、相性データを自動追加
    if ((newTag === 'nomination' || newTag === 'douhan') && existingOrder?.guest_id && existingOrder?.cast_id) {
        await addCompatibilityIfNotExists(supabase, existingOrder.guest_id, existingOrder.cast_id);
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
        return { amount: 0, setDurationMinutes: 20 };
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

/**
 * 出勤中のキャストIDリストを取得
 */
export async function getWorkingCastIds() {
    const supabase = await createServerClient() as any;

    // 現在の営業日を取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) return [];

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile?.store_id) return [];

    // 店舗の営業日切り替え時間を取得
    const { data: storeSettings } = await supabase
        .from("store_settings")
        .select("day_switch_time")
        .eq("store_id", profile.store_id)
        .maybeSingle();

    const daySwitchTime = storeSettings?.day_switch_time || "06:00";

    // 現在の営業日を計算
    const now = new Date();
    const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const [switchHour, switchMinute] = daySwitchTime.split(":").map(Number);

    let businessDate = new Date(jstNow);
    const currentHour = jstNow.getHours();
    const currentMinute = jstNow.getMinutes();

    // 現在時刻が切り替え時間より前の場合は前日の営業日
    if (currentHour < switchHour || (currentHour === switchHour && currentMinute < switchMinute)) {
        businessDate.setDate(businessDate.getDate() - 1);
    }

    const businessDateStr = businessDate.toISOString().split("T")[0];

    // 出勤中（status = "working"）かつ現在の営業日のキャストを取得
    const { data, error } = await supabase
        .from("work_records")
        .select("profile_id")
        .eq("store_id", profile.store_id)
        .eq("status", "working")
        .eq("work_date", businessDateStr);

    if (error) {
        console.error("Error fetching working casts:", error);
        return [];
    }

    return (data || []).map((r: any) => r.profile_id);
}

/**
 * ゲストとキャストの接客履歴データを取得
 * 同一セッション内では1回としてカウント
 */
export async function getCastGuestHistory(guestId: string) {
    const supabase = await createServerClient() as any;

    // ゲストに対する各キャストの接客回数を集計（セッション単位でユニーク）
    const { data, error } = await supabase
        .from("orders")
        .select(`
            cast_id,
            table_session_id
        `)
        .eq("guest_id", guestId)
        .not("cast_id", "is", null)
        .in("cast_status", ["nomination", "companion", "douhan", "serving", "ended"]);

    if (error) {
        console.error("Error fetching cast guest history:", error);
        return {};
    }

    // キャストごとの接客回数を集計（セッション単位でユニーク）
    const castSessionSet: Record<string, Set<string>> = {};
    for (const order of data || []) {
        if (order.cast_id && order.table_session_id) {
            if (!castSessionSet[order.cast_id]) {
                castSessionSet[order.cast_id] = new Set();
            }
            castSessionSet[order.cast_id].add(order.table_session_id);
        }
    }

    // Setのサイズをカウントに変換
    const castCounts: Record<string, number> = {};
    for (const [castId, sessions] of Object.entries(castSessionSet)) {
        castCounts[castId] = sessions.size;
    }

    return castCounts;
}

/**
 * ゲストとキャストの詳細な履歴データを取得
 * 指名・同伴・場内の回数を個別にカウント
 */
export interface CastGuestDetailedHistory {
    nomination: number;
    douhan: number;
    companion: number;
}

export async function getCastGuestDetailedHistory(guestId: string): Promise<Record<string, CastGuestDetailedHistory>> {
    const supabase = await createServerClient() as any;

    // ゲストに対する各キャストの指名・同伴・場内を取得
    const { data, error } = await supabase
        .from("orders")
        .select(`
            cast_id,
            item_name
        `)
        .eq("guest_id", guestId)
        .not("cast_id", "is", null)
        .in("item_name", ["指名料", "同伴料", "場内料金"]);

    if (error) {
        console.error("Error fetching cast guest detailed history:", error);
        return {};
    }

    // キャストごとの各種料金回数を集計
    const castDetails: Record<string, CastGuestDetailedHistory> = {};
    for (const order of data || []) {
        if (!order.cast_id) continue;

        if (!castDetails[order.cast_id]) {
            castDetails[order.cast_id] = { nomination: 0, douhan: 0, companion: 0 };
        }

        switch (order.item_name) {
            case "指名料":
                castDetails[order.cast_id].nomination++;
                break;
            case "同伴料":
                castDetails[order.cast_id].douhan++;
                break;
            case "場内料金":
                castDetails[order.cast_id].companion++;
                break;
        }
    }

    return castDetails;
}

/**
 * ゲストとキャストの相性（指名）を自動追加
 * 既に登録されていない場合のみ追加
 */
async function addCompatibilityIfNotExists(
    supabase: any,
    guestId: string,
    castId: string
) {
    // 既存の相性データを確認
    const { data: existing } = await supabase
        .from("profile_relationships")
        .select("id")
        .or(`and(source_profile_id.eq.${guestId},target_profile_id.eq.${castId}),and(source_profile_id.eq.${castId},target_profile_id.eq.${guestId})`)
        .eq("relationship_type", "compatibility_good")
        .maybeSingle();

    if (existing) {
        // 既に登録済み
        return;
    }

    // 相性データを追加
    await supabase
        .from("profile_relationships")
        .insert({
            source_profile_id: guestId,
            target_profile_id: castId,
            relationship_type: "compatibility_good",
        });
}

/**
 * ゲストとキャストの相性データを取得
 * 返り値: { castId: "good" | "bad" } の形式
 */
export async function getGuestCastCompatibility(guestId: string): Promise<Record<string, "good" | "bad">> {
    const supabase = await createServerClient() as any;

    // ゲストが設定した相性データを取得
    const { data, error } = await supabase
        .from("profile_relationships")
        .select("source_profile_id, target_profile_id, relationship_type")
        .or(`source_profile_id.eq.${guestId},target_profile_id.eq.${guestId}`)
        .in("relationship_type", ["compatibility_good", "compatibility_bad"]);

    if (error) {
        console.error("Error fetching compatibility:", error);
        return {};
    }

    const compatibility: Record<string, "good" | "bad"> = {};
    for (const rel of data || []) {
        // guestIdが source の場合は target がキャスト、逆も同様
        const castId = rel.source_profile_id === guestId
            ? rel.target_profile_id
            : rel.source_profile_id;

        if (rel.relationship_type === "compatibility_good") {
            compatibility[castId] = "good";
        } else if (rel.relationship_type === "compatibility_bad") {
            compatibility[castId] = "bad";
        }
    }

    return compatibility;
}
