"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

interface Reservation {
    id: string;
    store_id: string;
    guest_name: string;
    contact_value: string;
    contact_type: "email" | "phone";
    party_size: number;
    reservation_date: string;
    reservation_time: string;
    nominated_cast_id: string | null;
    status: "waiting" | "visited" | "cancelled";
    reservation_number: number;
    created_at: string;
    updated_at: string;
    nominated_cast?: {
        id: string;
        display_name: string;
    } | null;
}

// 予約一覧を取得
export async function getReservations(storeId: string) {
    const supabase = await createServerClient() as any;

    // 今日の日付（JST）
    const today = new Date().toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");

    // 過去の予約で待機中のものを自動キャンセル
    await supabase
        .from("reservations")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("store_id", storeId)
        .eq("status", "waiting")
        .lt("reservation_date", today);

    const { data, error } = await supabase
        .from("reservations")
        .select(`
            *,
            nominated_cast:profiles!nominated_cast_id(id, display_name)
        `)
        .eq("store_id", storeId)
        .order("reservation_date", { ascending: true })
        .order("reservation_time", { ascending: true });

    if (error) {
        console.error("Error fetching reservations:", error);
        return { success: false, reservations: [], error: error.message };
    }

    return { success: true, reservations: data as Reservation[] };
}

// 予約を削除
export async function deleteReservation(reservationId: string) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("reservations")
        .delete()
        .eq("id", reservationId);

    if (error) {
        console.error("Error deleting reservation:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/reservations");
    return { success: true };
}

// 来店済みにする（URL予約の場合はゲストprofileを作成または紐付け）
export async function markAsVisited(reservationId: string) {
    const supabase = await createServerClient() as any;

    // まず予約情報を取得
    const { data: reservation, error: fetchError } = await supabase
        .from("reservations")
        .select("*")
        .eq("id", reservationId)
        .single();

    if (fetchError || !reservation) {
        console.error("Error fetching reservation:", fetchError);
        return { success: false, error: "予約が見つかりません" };
    }

    // URL予約の場合（guest_nameが設定されていてreservation_guestsが未紐付け）
    // reservation_guestsテーブルにレコードがあるかチェック
    const { data: existingGuests } = await supabase
        .from("reservation_guests")
        .select("id")
        .eq("reservation_id", reservationId)
        .limit(1);

    const isUrlReservation = reservation.guest_name && (!existingGuests || existingGuests.length === 0);

    if (isUrlReservation && reservation.guest_name_kana) {
        // ひらがな名で同名ゲストを検索
        const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id, display_name, display_name_kana")
            .eq("store_id", reservation.store_id)
            .eq("role", "guest")
            .eq("display_name_kana", reservation.guest_name_kana)
            .or("is_temporary.is.null,is_temporary.eq.false")
            .maybeSingle();

        let guestProfileId: string;

        if (existingProfile) {
            // 同名ゲストが存在する場合はそのIDを使用
            guestProfileId = existingProfile.id;
        } else {
            // 新規ゲストprofileを作成
            const { data: newProfile, error: createError } = await supabase
                .from("profiles")
                .insert({
                    store_id: reservation.store_id,
                    display_name: reservation.guest_name,
                    display_name_kana: reservation.guest_name_kana,
                    role: "guest",
                    phone_number: reservation.contact_type === "phone" ? reservation.contact_value : null,
                })
                .select()
                .single();

            if (createError || !newProfile) {
                console.error("Error creating guest profile:", createError);
                // プロファイル作成に失敗してもステータス更新は続行
            } else {
                guestProfileId = newProfile.id;
            }
        }

        // reservation_guestsに紐付け（guestProfileIdが取得できた場合）
        if (guestProfileId!) {
            await supabase
                .from("reservation_guests")
                .insert({
                    reservation_id: reservationId,
                    guest_id: guestProfileId,
                });
        }
    }

    // ステータスを来店済みに更新
    const { error } = await supabase
        .from("reservations")
        .update({
            status: "visited",
            updated_at: new Date().toISOString(),
        })
        .eq("id", reservationId);

    if (error) {
        console.error("Error marking reservation as visited:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/reservations");
    return { success: true };
}

// 予約設定を取得
export async function getReservationSettings(storeId: string) {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("store_settings")
        .select("reservation_enabled")
        .eq("store_id", storeId)
        .single();

    if (error) {
        console.error("Error fetching reservation settings:", error);
        return {
            success: false,
            settings: { reservation_enabled: false },
            error: error.message
        };
    }

    return {
        success: true,
        settings: {
            reservation_enabled: data.reservation_enabled ?? false,
        }
    };
}

// 予約設定を更新
export async function updateReservationSettings(storeId: string, settings: {
    reservation_enabled: boolean;
}) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("store_settings")
        .update({
            reservation_enabled: settings.reservation_enabled,
        })
        .eq("store_id", storeId);

    if (error) {
        console.error("Error updating reservation settings:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/reservations");
    return { success: true };
}

// 管理者用: 予約を追加
export async function addReservation(data: {
    storeId: string;
    guestId?: string | null;
    guestName: string;
    contactValue: string;
    contactType: "email" | "phone";
    partySize: number;
    reservationDate: string;
    reservationTime: string;
    nominatedCastId: string | null;
}) {
    const supabase = await createServerClient() as any;

    // 予約番号を生成（店舗ごとの連番）
    const { data: lastReservation } = await supabase
        .from("reservations")
        .select("reservation_number")
        .eq("store_id", data.storeId)
        .order("reservation_number", { ascending: false })
        .limit(1)
        .maybeSingle();

    const nextNumber = (lastReservation?.reservation_number ?? 0) + 1;

    const { data: newReservation, error } = await supabase
        .from("reservations")
        .insert({
            store_id: data.storeId,
            guest_id: data.guestId || null,
            guest_name: data.guestName,
            contact_value: data.contactValue,
            contact_type: data.contactType,
            party_size: data.partySize,
            reservation_date: data.reservationDate,
            reservation_time: data.reservationTime,
            nominated_cast_id: data.nominatedCastId || null,
            reservation_number: nextNumber,
            status: "waiting",
        })
        .select(`
            *,
            nominated_cast:profiles!nominated_cast_id(id, display_name)
        `)
        .single();

    if (error) {
        console.error("Error adding reservation:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/reservations");
    return { success: true, reservation: newReservation as Reservation };
}

// V2: 複数ゲスト・キャスト対応の予約追加
export async function addReservationV2(data: {
    storeId: string;
    reservationDate: string;
    reservationTime: string;
    partySize: number;
    tableId?: string | null;
    guests: {
        guestId: string;
        casts: {
            castId: string;
            nominationType: "shimei" | "douhan" | "banai";
        }[];
    }[];
}) {
    const supabase = await createServerClient() as any;

    // 予約番号を生成（店舗ごとの連番）
    const { data: lastReservation } = await supabase
        .from("reservations")
        .select("reservation_number")
        .eq("store_id", data.storeId)
        .order("reservation_number", { ascending: false })
        .limit(1)
        .maybeSingle();

    const nextNumber = (lastReservation?.reservation_number ?? 0) + 1;

    // 最初のゲスト名を取得（表示用）
    let mainGuestName = "ゲスト";
    if (data.guests.length > 0) {
        const { data: guestProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", data.guests[0].guestId)
            .single();
        if (guestProfile) {
            mainGuestName = guestProfile.display_name;
            if (data.guests.length > 1) {
                mainGuestName += ` 他${data.guests.length - 1}名`;
            }
        }
    }

    // 予約を作成
    const { data: newReservation, error } = await supabase
        .from("reservations")
        .insert({
            store_id: data.storeId,
            guest_id: data.guests[0]?.guestId || null,
            guest_name: mainGuestName,
            contact_value: "",
            contact_type: "phone",
            party_size: data.partySize,
            reservation_date: data.reservationDate,
            reservation_time: data.reservationTime,
            reservation_number: nextNumber,
            status: "waiting",
            table_id: data.tableId || null,
        })
        .select()
        .single();

    if (error) {
        console.error("Error adding reservation:", error);
        return { success: false, error: error.message };
    }

    // reservation_guests に追加
    if (data.guests.length > 0) {
        const guestInserts = data.guests.map((g) => ({
            reservation_id: newReservation.id,
            guest_id: g.guestId,
        }));
        await supabase.from("reservation_guests").insert(guestInserts);
    }

    // reservation_casts に追加
    const castInserts: any[] = [];
    for (const guest of data.guests) {
        for (const cast of guest.casts) {
            castInserts.push({
                reservation_id: newReservation.id,
                guest_id: guest.guestId,
                cast_id: cast.castId,
                nomination_type: cast.nominationType,
            });
        }
    }
    if (castInserts.length > 0) {
        await supabase.from("reservation_casts").insert(castInserts);
    }

    revalidatePath("/app/reservations");
    revalidatePath("/app/floor");
    return { success: true, reservation: newReservation };
}

// キャスト一覧を取得（在籍中・体入のみ）
export async function getCastsForStore(storeId: string) {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, status")
        .eq("store_id", storeId)
        .eq("role", "cast")
        .in("status", ["在籍中", "体入"])
        .order("display_name", { ascending: true });

    if (error) {
        console.error("Error fetching casts:", error);
        return { success: false, casts: [] };
    }

    return { success: true, casts: data || [] };
}

// ゲスト一覧を取得（role=guest のプロフィール、仮ゲストを除外）
export async function getGuestsForStore(storeId: string) {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("store_id", storeId)
        .eq("role", "guest")
        .or("is_temporary.is.null,is_temporary.eq.false")
        .order("display_name", { ascending: true });

    if (error) {
        console.error("Error fetching guests:", error);
        return { success: false, guests: [] };
    }

    return { success: true, guests: data || [] };
}

// テーブル一覧を取得
export async function getTablesForStore(storeId: string) {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("tables")
        .select("id, name, capacity")
        .eq("store_id", storeId)
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching tables:", error);
        return { success: false, tables: [] };
    }

    return { success: true, tables: data || [] };
}

// 予約詳細を取得（V2: ゲスト・キャスト情報含む）
export async function getReservationDetail(reservationId: string) {
    const supabase = await createServerClient() as any;

    // 予約本体を取得
    const { data: reservation, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("id", reservationId)
        .single();

    if (error) {
        console.error("Error fetching reservation:", error);
        return { success: false, error: error.message };
    }

    // reservation_guests を取得
    const { data: reservationGuests } = await supabase
        .from("reservation_guests")
        .select(`
            guest_id,
            guest:profiles!guest_id(id, display_name)
        `)
        .eq("reservation_id", reservationId);

    // reservation_casts を取得
    const { data: reservationCasts } = await supabase
        .from("reservation_casts")
        .select(`
            guest_id,
            cast_id,
            nomination_type,
            cast:profiles!cast_id(id, display_name)
        `)
        .eq("reservation_id", reservationId);

    // ゲストごとにキャストをまとめる
    const guestsWithCasts = (reservationGuests || []).map((rg: any) => {
        const guestCasts = (reservationCasts || [])
            .filter((rc: any) => rc.guest_id === rg.guest_id)
            .map((rc: any) => ({
                id: rc.cast_id,
                display_name: rc.cast?.display_name || "",
                nomination_type: rc.nomination_type,
            }));
        return {
            id: rg.guest_id,
            display_name: rg.guest?.display_name || "",
            casts: guestCasts,
        };
    });

    return {
        success: true,
        reservation: {
            ...reservation,
            guests: guestsWithCasts,
        },
    };
}

// V2: 予約を更新
export async function updateReservationV2(data: {
    reservationId: string;
    reservationDate: string;
    reservationTime: string;
    partySize: number;
    tableId?: string | null;
    guests: {
        guestId: string;
        casts: {
            castId: string;
            nominationType: "shimei" | "douhan" | "banai";
        }[];
    }[];
}) {
    const supabase = await createServerClient() as any;

    // ゲスト名を取得（表示用）
    let mainGuestName = "ゲスト";
    if (data.guests.length > 0) {
        const { data: guestProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", data.guests[0].guestId)
            .single();
        if (guestProfile) {
            mainGuestName = guestProfile.display_name;
            if (data.guests.length > 1) {
                mainGuestName += ` 他${data.guests.length - 1}名`;
            }
        }
    }

    // 予約本体を更新
    const { error } = await supabase
        .from("reservations")
        .update({
            guest_id: data.guests[0]?.guestId || null,
            guest_name: mainGuestName,
            party_size: data.partySize,
            reservation_date: data.reservationDate,
            reservation_time: data.reservationTime,
            table_id: data.tableId || null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", data.reservationId);

    if (error) {
        console.error("Error updating reservation:", error);
        return { success: false, error: error.message };
    }

    // 既存の reservation_guests を削除して再作成
    await supabase
        .from("reservation_guests")
        .delete()
        .eq("reservation_id", data.reservationId);

    if (data.guests.length > 0) {
        const guestInserts = data.guests.map((g) => ({
            reservation_id: data.reservationId,
            guest_id: g.guestId,
        }));
        await supabase.from("reservation_guests").insert(guestInserts);
    }

    // 既存の reservation_casts を削除して再作成
    await supabase
        .from("reservation_casts")
        .delete()
        .eq("reservation_id", data.reservationId);

    const castInserts: any[] = [];
    for (const guest of data.guests) {
        for (const cast of guest.casts) {
            castInserts.push({
                reservation_id: data.reservationId,
                guest_id: guest.guestId,
                cast_id: cast.castId,
                nomination_type: cast.nominationType,
            });
        }
    }
    if (castInserts.length > 0) {
        await supabase.from("reservation_casts").insert(castInserts);
    }

    revalidatePath("/app/reservations");
    revalidatePath("/app/floor");
    return { success: true };
}

// URL経由の予約を更新（profiles未登録のゲスト）
export async function updateUrlReservation(data: {
    reservationId: string;
    reservationDate: string;
    reservationTime: string;
    partySize: number;
    tableId?: string | null;
    guestName: string;
    guestNameKana?: string;
    contactType: "email" | "phone";
    contactValue: string;
    nominatedCastId?: string | null;
}) {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("reservations")
        .update({
            guest_name: data.guestName,
            guest_name_kana: data.guestNameKana || null,
            contact_type: data.contactType,
            contact_value: data.contactValue,
            party_size: data.partySize,
            reservation_date: data.reservationDate,
            reservation_time: data.reservationTime,
            table_id: data.tableId || null,
            nominated_cast_id: data.nominatedCastId || null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", data.reservationId);

    if (error) {
        console.error("Error updating url reservation:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/reservations");
    revalidatePath("/app/floor");
    return { success: true };
}
