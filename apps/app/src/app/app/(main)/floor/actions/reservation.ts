"use server";

import { getAuthenticatedStoreId, revalidateFloorAndSlips } from "./auth";

// 予約データ型
interface ReservationData {
    id: string;
    store_id: string;
    guest_name: string;
    party_size: number;
    reservation_date: string;
    reservation_time: string;
    status: string;
    guest_id?: string | null;
    nominated_cast?: {
        id: string;
        display_name: string;
    } | null;
}

/**
 * 今日の予約を取得（フロア表示用）
 */
export async function getTodayReservations(): Promise<ReservationData[]> {
    const { supabase, storeId } = await getAuthenticatedStoreId();

    // 今日の日付（JST）
    const today = new Date().toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");

    const { data, error } = await supabase
        .from("reservations")
        .select(`
            *,
            nominated_cast:profiles!nominated_cast_id(id, display_name)
        `)
        .eq("store_id", storeId)
        .eq("reservation_date", today)
        .eq("status", "waiting")
        .order("reservation_time", { ascending: true });

    if (error) {
        console.error("Error fetching today's reservations:", error);
        return [];
    }

    return data || [];
}

/**
 * 予約からセッションを作成（来店済み処理）
 */
export async function createSessionFromReservation(reservationId: string) {
    const { supabase, storeId } = await getAuthenticatedStoreId();

    // 予約情報を取得
    const { data: reservation, error: reservationError } = await supabase
        .from("reservations")
        .select("*")
        .eq("id", reservationId)
        .single();

    if (reservationError || !reservation) {
        console.error("Error fetching reservation:", reservationError);
        return { success: false, error: "予約が見つかりません" };
    }

    // reservation_guests を取得
    const { data: reservationGuests } = await supabase
        .from("reservation_guests")
        .select("guest_id")
        .eq("reservation_id", reservationId);

    // reservation_casts を取得
    const { data: reservationCasts } = await supabase
        .from("reservation_casts")
        .select("guest_id, cast_id, nomination_type")
        .eq("reservation_id", reservationId);

    // デフォルトの料金システムを取得
    const { data: defaultPricingSystem } = await supabase
        .from("pricing_systems")
        .select("id")
        .eq("store_id", storeId)
        .eq("is_default", true)
        .single();

    // セッションを作成
    const { data: session, error: sessionError } = await supabase
        .from("table_sessions")
        .insert({
            store_id: storeId,
            table_id: null,
            guest_count: reservation.party_size,
            pricing_system_id: defaultPricingSystem?.id || null,
            status: 'active'
        })
        .select()
        .single();

    if (sessionError) {
        console.error("Error creating session:", sessionError);
        return { success: false, error: "セッションの作成に失敗しました" };
    }

    // ゲストをセッションに追加
    const guestIds: string[] = [];

    if (reservationGuests && reservationGuests.length > 0) {
        for (const rg of reservationGuests) {
            guestIds.push(rg.guest_id);
            await supabase.from("session_guests").insert({
                table_session_id: session.id,
                guest_id: rg.guest_id,
            });
        }
    } else if (reservation.guest_id) {
        guestIds.push(reservation.guest_id);
        await supabase.from("session_guests").insert({
            table_session_id: session.id,
            guest_id: reservation.guest_id,
        });
    } else {
        // 一時ゲストを作成
        const { data: tempGuest } = await supabase
            .from("profiles")
            .insert({
                store_id: storeId,
                display_name: reservation.guest_name,
                role: "guest",
                is_temporary: true,
            })
            .select()
            .single();

        if (tempGuest) {
            guestIds.push(tempGuest.id);
            await supabase.from("session_guests").insert({
                table_session_id: session.id,
                guest_id: tempGuest.id,
            });
        }
    }

    // party_size > 登録ゲスト数 の場合、名無しゲストを追加
    const additionalGuests = reservation.party_size - guestIds.length;
    for (let i = 0; i < additionalGuests; i++) {
        const { data: tempGuest } = await supabase
            .from("profiles")
            .insert({
                store_id: storeId,
                display_name: `ゲスト${i + 1}`,
                role: "guest",
                is_temporary: true,
            })
            .select()
            .single();

        if (tempGuest) {
            await supabase.from("session_guests").insert({
                table_session_id: session.id,
                guest_id: tempGuest.id,
            });
        }
    }

    // キャストの指名料をオーダーとして追加
    if (reservationCasts && reservationCasts.length > 0) {
        for (const rc of reservationCasts) {
            const itemName = rc.nomination_type === 'shimei' ? '指名料'
                : rc.nomination_type === 'douhan' ? '同伴料'
                : '場内料金';

            await supabase.from("orders").insert({
                table_session_id: session.id,
                store_id: storeId,
                guest_id: rc.guest_id,
                cast_id: rc.cast_id,
                item_name: itemName,
                quantity: 1,
                amount: 0,
                status: 'pending',
            });
        }
    }

    // 予約ステータスを来店済みに更新
    await supabase
        .from("reservations")
        .update({
            status: "visited",
            updated_at: new Date().toISOString(),
        })
        .eq("id", reservationId);

    revalidateFloorAndSlips();
    return { success: true, sessionId: session.id };
}
