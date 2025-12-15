"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidateFloorAndSlips } from "./auth";
import type { AutoFeeResult, SessionDataV2, PricingSystemData } from "./types";

interface SessionWithPricing extends SessionDataV2 {
    pricing_systems: PricingSystemData | null;
}

/**
 * アクティブなセッションの自動料金追加をチェック・実行
 * - セット時間経過後、ゲストごとに延長料金を追加
 * - キャストの接客時間が延長単位を超えるたびに指名料/場内料金/同伴料を追加
 */
export async function processAutoFees(): Promise<{ success: boolean; addedFees: AutoFeeResult[]; error?: string }> {
    const supabase = await createServerClient() as any;
    const now = new Date();

    // アクティブなセッションを取得
    const { data: sessions, error: sessionsError } = await supabase
        .from("table_sessions")
        .select(`
            *,
            pricing_systems(*),
            session_guests(*, profiles(*)),
            orders(*)
        `)
        .eq("status", "active");

    if (sessionsError) {
        console.error("Error fetching sessions for auto fees:", sessionsError);
        return { success: false, addedFees: [], error: sessionsError.message };
    }

    const addedFees: AutoFeeResult[] = [];

    for (const session of (sessions || []) as SessionWithPricing[]) {
        const pricingSystem = session.pricing_systems;
        if (!pricingSystem) continue;

        const sessionStartTime = new Date(session.start_time);
        const elapsedMinutes = Math.floor((now.getTime() - sessionStartTime.getTime()) / (1000 * 60));

        const setDuration = pricingSystem.set_duration_minutes || 60;
        const extensionDuration = pricingSystem.extension_duration_minutes || 30;
        const extensionFee = pricingSystem.extension_fee || 0;

        // 1. ゲストごとの延長料金チェック
        const guestExtensions = await processGuestExtensionFees(
            supabase,
            session,
            elapsedMinutes,
            setDuration,
            extensionDuration,
            extensionFee,
            now
        );
        addedFees.push(...guestExtensions);

        // 2. キャスト料金の延長チェック
        const castExtensions = await processCastExtensionFees(
            supabase,
            session,
            pricingSystem,
            extensionDuration,
            now
        );
        addedFees.push(...castExtensions);
    }

    revalidateFloorAndSlips();

    return { success: true, addedFees };
}

/**
 * ゲストの延長料金を処理
 */
async function processGuestExtensionFees(
    supabase: any,
    session: SessionWithPricing,
    elapsedMinutes: number,
    setDuration: number,
    extensionDuration: number,
    extensionFee: number,
    now: Date
): Promise<AutoFeeResult[]> {
    const addedFees: AutoFeeResult[] = [];
    const sessionGuests = session.session_guests || [];
    const orders = session.orders || [];

    for (const sg of sessionGuests) {
        const guestId = (sg as any).guest_id;

        // このゲストの既存延長料金オーダーを数える
        const existingExtensions = orders.filter((o: any) =>
            o.item_name === '延長料金' && o.guest_id === guestId
        ).length;

        // セット時間経過後、延長単位ごとに延長料金を追加
        if (elapsedMinutes > setDuration) {
            const overtimeMinutes = elapsedMinutes - setDuration;
            const expectedExtensions = Math.floor(overtimeMinutes / extensionDuration) +
                (overtimeMinutes % extensionDuration > 0 ? 1 : 0);

            if (expectedExtensions > existingExtensions && extensionFee > 0) {
                const toAdd = expectedExtensions - existingExtensions;
                for (let i = 0; i < toAdd; i++) {
                    await supabase.from("orders").insert({
                        table_session_id: session.id,
                        item_name: '延長料金',
                        quantity: 1,
                        amount: extensionFee,
                        guest_id: guestId,
                        cast_id: null,
                    });
                    addedFees.push({
                        sessionId: session.id,
                        type: '延長料金',
                        guestId,
                        amount: extensionFee,
                    });
                }
            }
        }
    }

    return addedFees;
}

/**
 * キャストの延長料金を処理
 */
async function processCastExtensionFees(
    supabase: any,
    session: SessionWithPricing,
    pricingSystem: PricingSystemData,
    extensionDuration: number,
    now: Date
): Promise<AutoFeeResult[]> {
    const addedFees: AutoFeeResult[] = [];
    const orders = session.orders || [];

    // キャスト関連オーダー（指名料、場内料金、同伴料）を取得
    const castOrders = orders.filter((o: any) =>
        o.cast_id != null && ['指名料', '場内料金', '同伴料'].includes(o.item_name)
    );

    // キャスト×ゲスト×料金種類ごとにグループ化
    const castOrderGroups = new Map<string, any[]>();
    for (const order of castOrders) {
        const key = `${order.cast_id}-${order.guest_id}-${order.item_name}`;
        if (!castOrderGroups.has(key)) {
            castOrderGroups.set(key, []);
        }
        castOrderGroups.get(key)!.push(order);
    }

    // 各グループについて処理
    for (const [, groupOrders] of castOrderGroups) {
        const activeOrders = groupOrders.filter((o: any) => o.cast_status !== 'ended');
        if (activeOrders.length === 0) continue;

        // 最も古いオーダーを取得
        const oldestOrder = groupOrders.reduce((oldest: any, current: any) => {
            if (!oldest) return current;
            return new Date(current.start_time || current.created_at) <
                   new Date(oldest.start_time || oldest.created_at) ? current : oldest;
        }, null);

        if (!oldestOrder) continue;

        const castStartTime = new Date(oldestOrder.start_time || oldestOrder.created_at);
        const castElapsedMinutes = Math.floor((now.getTime() - castStartTime.getTime()) / (1000 * 60));

        const itemName = oldestOrder.item_name as string;
        const { castSetDuration, castFee } = getCastFeeParams(itemName, pricingSystem);

        // セット時間経過後、延長単位ごとに追加料金
        if (castElapsedMinutes > castSetDuration) {
            const overtimeMinutes = castElapsedMinutes - castSetDuration;
            const expectedCount = 1 + Math.floor(overtimeMinutes / extensionDuration) +
                (overtimeMinutes % extensionDuration > 0 ? 1 : 0);
            const currentCount = groupOrders.length;

            if (expectedCount > currentCount && castFee > 0) {
                const toAdd = expectedCount - currentCount;
                for (let i = 0; i < toAdd; i++) {
                    await supabase.from("orders").insert({
                        table_session_id: session.id,
                        item_name: itemName,
                        quantity: 1,
                        amount: castFee,
                        guest_id: oldestOrder.guest_id,
                        cast_id: oldestOrder.cast_id,
                        start_time: now.toISOString(),
                        cast_status: 'serving',
                    });
                    addedFees.push({
                        sessionId: session.id,
                        type: itemName,
                        guestId: oldestOrder.guest_id,
                        castId: oldestOrder.cast_id,
                        amount: castFee,
                    });
                }
            }
        }
    }

    return addedFees;
}

/**
 * 料金タイプに応じたセット時間と料金を取得
 */
function getCastFeeParams(
    itemName: string,
    pricingSystem: PricingSystemData
): { castSetDuration: number; castFee: number } {
    switch (itemName) {
        case '指名料':
            return {
                castSetDuration: pricingSystem.nomination_set_duration_minutes || 60,
                castFee: pricingSystem.nomination_fee || 0,
            };
        case '場内料金':
            return {
                castSetDuration: pricingSystem.companion_set_duration_minutes || 60,
                castFee: pricingSystem.companion_fee || 0,
            };
        case '同伴料':
            return {
                castSetDuration: pricingSystem.douhan_set_duration_minutes || 60,
                castFee: pricingSystem.douhan_fee || 0,
            };
        default:
            return { castSetDuration: 60, castFee: 0 };
    }
}
