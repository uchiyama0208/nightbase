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

// キューエントリ型（フロア表示用）
export interface QueueEntryData {
    id: string;
    store_id: string;
    guest_name: string;
    party_size: number;
    queue_number: number;
    status: string;
    created_at: string;
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

    const { data, error } = await (supabase as any)
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
 * 今日のキューエントリを取得（フロア表示用）
 */
export async function getTodayQueueEntries(): Promise<QueueEntryData[]> {
    const { supabase, storeId } = await getAuthenticatedStoreId();

    // 店舗の営業日切り替え時間を取得
    const { data: storeSettings } = await (supabase as any)
        .from("store_settings")
        .select("day_switch_time")
        .eq("store_id", storeId)
        .single();

    const daySwitchTime = storeSettings?.day_switch_time || "05:00";

    // 営業日開始時刻を計算
    const now = new Date();
    const [switchHour, switchMinute] = daySwitchTime.split(":").map(Number);
    const todaySwitch = new Date(now);
    todaySwitch.setHours(switchHour, switchMinute, 0, 0);

    // 現在時刻が切り替え時刻より前なら、前日の切り替え時刻からの期間
    if (now < todaySwitch) {
        todaySwitch.setDate(todaySwitch.getDate() - 1);
    }

    const businessDayStart = todaySwitch.toISOString();

    const { data, error } = await (supabase as any)
        .from("queue_entries")
        .select(`
            id,
            store_id,
            guest_name,
            party_size,
            queue_number,
            status,
            created_at,
            nominated_cast:profiles!queue_entries_nominated_cast_id_fkey(id, display_name)
        `)
        .eq("store_id", storeId)
        .gte("created_at", businessDayStart)
        .in("status", ["waiting", "notified"])
        .order("queue_number", { ascending: true });

    if (error) {
        console.error("Error fetching today's queue entries:", error);
        return [];
    }

    return data || [];
}

/**
 * 予約からセッションを作成（来店済み処理）
 */
export async function createSessionFromReservation(reservationId: string) {
    const { supabase, storeId } = await getAuthenticatedStoreId();
    const sb = supabase as any;

    // 予約情報を取得
    const { data: reservation, error: reservationError } = await sb
        .from("reservations")
        .select("*")
        .eq("id", reservationId)
        .single();

    if (reservationError || !reservation) {
        console.error("Error fetching reservation:", reservationError);
        return { success: false, error: "予約が見つかりません" };
    }

    // reservation_guests を取得
    const { data: reservationGuests } = await sb
        .from("reservation_guests")
        .select("guest_id")
        .eq("reservation_id", reservationId);

    // reservation_casts を取得
    const { data: reservationCasts } = await sb
        .from("reservation_casts")
        .select("guest_id, cast_id, nomination_type")
        .eq("reservation_id", reservationId);

    // デフォルトの料金システムを取得
    const { data: defaultPricingSystem } = await sb
        .from("pricing_systems")
        .select("id")
        .eq("store_id", storeId)
        .eq("is_default", true)
        .single();

    // セッションを作成
    const { data: session, error: sessionError } = await sb
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
            await sb.from("session_guests").insert({
                table_session_id: session.id,
                guest_id: rg.guest_id,
            });
        }
    } else if (reservation.guest_id) {
        guestIds.push(reservation.guest_id);
        await sb.from("session_guests").insert({
            table_session_id: session.id,
            guest_id: reservation.guest_id,
        });
    } else {
        // ゲスト名だけでセッションに追加（profilesにレコードを作成しない）
        await sb.from("session_guests").insert({
            table_session_id: session.id,
            guest_id: null,
            guest_name: reservation.guest_name,
        });
    }

    // party_size > 登録ゲスト数 の場合、名無しゲストを追加
    const additionalGuests = reservation.party_size - guestIds.length;
    for (let i = 0; i < additionalGuests; i++) {
        // ゲスト名だけでセッションに追加（profilesにレコードを作成しない）
        await sb.from("session_guests").insert({
            table_session_id: session.id,
            guest_id: null,
            guest_name: `ゲスト${i + 1}`,
        });
    }

    // キャストの指名料をオーダーとして追加
    if (reservationCasts && reservationCasts.length > 0) {
        const now = new Date();

        // 料金システムから各セット時間を取得
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let pricingSystem: any = null;
        if (defaultPricingSystem?.id) {
            const { data: ps } = await sb
                .from("pricing_systems")
                .select("*")
                .eq("id", defaultPricingSystem.id)
                .single();
            pricingSystem = ps;
        }

        for (const rc of reservationCasts) {
            const itemName = rc.nomination_type === 'shimei' ? '指名料'
                : rc.nomination_type === 'douhan' ? '同伴料'
                : '場内料金';

            // セット時間を決定
            let setDurationMinutes = 60;
            let amount = 0;
            if (pricingSystem) {
                if (rc.nomination_type === 'shimei') {
                    setDurationMinutes = pricingSystem.nomination_set_duration_minutes || 60;
                    amount = pricingSystem.nomination_fee || 0;
                } else if (rc.nomination_type === 'douhan') {
                    setDurationMinutes = pricingSystem.douhan_set_duration_minutes || 60;
                    amount = pricingSystem.douhan_fee || 0;
                } else {
                    setDurationMinutes = pricingSystem.companion_set_duration_minutes || 60;
                    amount = pricingSystem.companion_fee || 0;
                }
            }

            const endTime = new Date(now.getTime() + setDurationMinutes * 60 * 1000);

            await sb.from("orders").insert({
                table_session_id: session.id,
                store_id: storeId,
                guest_id: rc.guest_id,
                cast_id: rc.cast_id,
                item_name: itemName,
                quantity: 1,
                amount: amount,
                status: 'pending',
                cast_status: 'serving',
                start_time: now.toISOString(),
                end_time: endTime.toISOString(),
            });
        }
    }

    // 予約ステータスを来店済みに更新
    await sb
        .from("reservations")
        .update({
            status: "visited",
            updated_at: new Date().toISOString(),
        })
        .eq("id", reservationId);

    revalidateFloorAndSlips();
    return { success: true, sessionId: session.id };
}

/**
 * キューエントリからセッションを作成（来店済み処理）
 */
export async function createSessionFromQueueEntry(entryId: string) {
    const { supabase, storeId } = await getAuthenticatedStoreId();
    const sb = supabase as any;

    // キューエントリ情報を取得
    const { data: entry, error: entryError } = await sb
        .from("queue_entries")
        .select("*, nominated_cast:profiles!queue_entries_nominated_cast_id_fkey(id, display_name)")
        .eq("id", entryId)
        .single();

    if (entryError || !entry) {
        console.error("Error fetching queue entry:", entryError);
        return { success: false, error: "順番待ちエントリが見つかりません" };
    }

    // デフォルトの料金システムを取得
    const { data: defaultPricingSystem } = await sb
        .from("pricing_systems")
        .select("id")
        .eq("store_id", storeId)
        .eq("is_default", true)
        .single();

    // セッションを作成
    const { data: session, error: sessionError } = await sb
        .from("table_sessions")
        .insert({
            store_id: storeId,
            table_id: null,
            guest_count: entry.party_size,
            pricing_system_id: defaultPricingSystem?.id || null,
            status: 'active'
        })
        .select()
        .single();

    if (sessionError) {
        console.error("Error creating session:", sessionError);
        return { success: false, error: "セッションの作成に失敗しました" };
    }

    // ゲストをセッションに追加（ゲスト名のみで作成）
    await sb.from("session_guests").insert({
        table_session_id: session.id,
        guest_id: null,
        guest_name: entry.guest_name,
    });

    // party_size > 1 の場合、残りのゲストを追加
    for (let i = 1; i < entry.party_size; i++) {
        await sb.from("session_guests").insert({
            table_session_id: session.id,
            guest_id: null,
            guest_name: `ゲスト${i + 1}`,
        });
    }

    // 指名キャストがいる場合、指名料をオーダーとして追加
    if (entry.nominated_cast_id) {
        const now = new Date();

        // 料金システムから指名セット時間と料金を取得
        let setDurationMinutes = 60;
        let amount = 0;
        if (defaultPricingSystem?.id) {
            const { data: ps } = await sb
                .from("pricing_systems")
                .select("nomination_set_duration_minutes, nomination_fee")
                .eq("id", defaultPricingSystem.id)
                .single();
            if (ps) {
                setDurationMinutes = ps.nomination_set_duration_minutes || 60;
                amount = ps.nomination_fee || 0;
            }
        }

        const endTime = new Date(now.getTime() + setDurationMinutes * 60 * 1000);

        await sb.from("orders").insert({
            table_session_id: session.id,
            store_id: storeId,
            guest_id: null,
            cast_id: entry.nominated_cast_id,
            item_name: "指名料",
            quantity: 1,
            amount: amount,
            status: 'pending',
            cast_status: 'serving',
            start_time: now.toISOString(),
            end_time: endTime.toISOString(),
        });
    }

    // キューエントリのステータスを来店済みに更新
    await sb
        .from("queue_entries")
        .update({
            status: "visited",
            updated_at: new Date().toISOString(),
        })
        .eq("id", entryId);

    revalidateFloorAndSlips();
    return { success: true, sessionId: session.id };
}
