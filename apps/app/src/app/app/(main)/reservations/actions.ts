"use server";

import { createServerClient, createServiceRoleClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import { getAppData, hasPagePermission } from "../../data-access";

/**
 * 予約ページ用のデータを取得
 */
export async function getReservationsPageData() {
    const { profile, permissions } = await getAppData();

    if (!profile?.store_id) {
        throw new Error("No store found");
    }

    const supabase = await createServerClient() as any;

    // 店舗設定を取得
    const { data: storeSettings } = await supabase
        .from("store_settings")
        .select("reservation_enabled, reservation_email_setting, reservation_phone_setting, reservation_cast_selection_enabled, day_switch_time")
        .eq("store_id", profile.store_id)
        .maybeSingle();

    // 店舗名を取得
    const { data: store } = await supabase
        .from("stores")
        .select("name")
        .eq("id", profile.store_id)
        .maybeSingle();

    // 予約一覧を取得
    const { reservations } = await getReservations(profile.store_id);

    return {
        storeId: profile.store_id,
        storeName: store?.name || "",
        reservations: reservations || [],
        settings: {
            reservation_enabled: storeSettings?.reservation_enabled ?? false,
            reservation_email_setting: storeSettings?.reservation_email_setting ?? "required",
            reservation_phone_setting: storeSettings?.reservation_phone_setting ?? "hidden",
            reservation_cast_selection_enabled: storeSettings?.reservation_cast_selection_enabled ?? true,
        },
        daySwitchTime: storeSettings?.day_switch_time || "05:00",
    };
}

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

// 予約ステータスを更新
export async function updateReservationStatus(reservationId: string, status: "waiting" | "visited" | "cancelled") {
    const supabase = await createServerClient() as any;

    const { error } = await supabase
        .from("reservations")
        .update({
            status,
            updated_at: new Date().toISOString(),
        })
        .eq("id", reservationId);

    if (error) {
        console.error("Error updating reservation status:", error);
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
            .maybeSingle();

        let guestProfileId: string | undefined;

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
        if (guestProfileId) {
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
        .select("reservation_enabled, reservation_email_setting, reservation_phone_setting")
        .eq("store_id", storeId)
        .single();

    if (error) {
        console.error("Error fetching reservation settings:", error);
        return {
            success: false,
            settings: {
                reservation_enabled: false,
                reservation_email_setting: "required" as const,
                reservation_phone_setting: "hidden" as const,
            },
            error: error.message
        };
    }

    return {
        success: true,
        settings: {
            reservation_enabled: data.reservation_enabled ?? false,
            reservation_email_setting: data.reservation_email_setting ?? "required",
            reservation_phone_setting: data.reservation_phone_setting ?? "hidden",
        }
    };
}

// 予約設定を更新
export async function updateReservationSettings(storeId: string, settings: {
    reservation_enabled: boolean;
    reservation_email_setting?: "hidden" | "optional" | "required";
    reservation_phone_setting?: "hidden" | "optional" | "required";
    reservation_cast_selection_enabled?: boolean;
}) {
    const supabase = await createServerClient() as any;

    const updateData: any = {
        store_id: storeId,
        reservation_enabled: settings.reservation_enabled,
    };

    if (settings.reservation_email_setting !== undefined) {
        updateData.reservation_email_setting = settings.reservation_email_setting;
    }
    if (settings.reservation_phone_setting !== undefined) {
        updateData.reservation_phone_setting = settings.reservation_phone_setting;
    }
    if (settings.reservation_cast_selection_enabled !== undefined) {
        updateData.reservation_cast_selection_enabled = settings.reservation_cast_selection_enabled;
    }

    const { error } = await supabase
        .from("store_settings")
        .upsert(updateData, {
            onConflict: "store_id",
        });

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
    email?: string;
    phone?: string;
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

    // 連絡先情報を決定（emailが優先）
    let contactType: "email" | "phone" = "phone";
    let contactValue = "";
    if (data.email) {
        contactType = "email";
        contactValue = data.email;
    } else if (data.phone) {
        contactType = "phone";
        contactValue = data.phone;
    }

    // 予約を作成
    const { data: newReservation, error } = await supabase
        .from("reservations")
        .insert({
            store_id: data.storeId,
            guest_id: data.guests[0]?.guestId || null,
            guest_name: mainGuestName,
            contact_value: contactValue,
            contact_type: contactType,
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

// ゲスト一覧を取得（role=guest のプロフィール）
export async function getGuestsForStore(storeId: string) {
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("store_id", storeId)
        .eq("role", "guest")
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
    email?: string;
    phone?: string;
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

    // 連絡先情報を決定（emailが優先）
    let contactType: "email" | "phone" = "phone";
    let contactValue = "";
    if (data.email) {
        contactType = "email";
        contactValue = data.email;
    } else if (data.phone) {
        contactType = "phone";
        contactValue = data.phone;
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
            contact_type: contactType,
            contact_value: contactValue,
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

// ========================================
// カスタム質問（Custom Fields）関連
// ========================================

export interface CustomField {
    id: string;
    store_id: string;
    field_type: "text" | "textarea" | "select" | "checkbox";
    label: string;
    options: string[] | null;
    is_required: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

// カスタム質問一覧を取得
export async function getCustomFields(storeId: string) {
    const supabase = createServiceRoleClient() as any;

    const { data, error } = await supabase
        .from("reservation_custom_fields")
        .select("*")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("Error fetching custom fields:", error);
        return { success: false, fields: [], error: error.message };
    }

    return { success: true, fields: data as CustomField[] };
}

// カスタム質問を作成
export async function createCustomField(data: {
    storeId: string;
    fieldType: "text" | "textarea" | "select" | "checkbox";
    label: string;
    options?: string[];
    isRequired: boolean;
}) {
    const supabase = createServiceRoleClient() as any;

    // 現在の最大sort_orderを取得
    const { data: lastField } = await supabase
        .from("reservation_custom_fields")
        .select("sort_order")
        .eq("store_id", data.storeId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

    const nextSortOrder = (lastField?.sort_order ?? -1) + 1;

    const { data: newField, error } = await supabase
        .from("reservation_custom_fields")
        .insert({
            store_id: data.storeId,
            field_type: data.fieldType,
            label: data.label,
            options: data.options || null,
            is_required: data.isRequired,
            sort_order: nextSortOrder,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating custom field:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/reservations");
    return { success: true, field: newField as CustomField };
}

// カスタム質問を更新
export async function updateCustomField(data: {
    fieldId: string;
    fieldType?: "text" | "textarea" | "select" | "checkbox";
    label?: string;
    options?: string[] | null;
    isRequired?: boolean;
}) {
    const supabase = createServiceRoleClient() as any;

    const updateData: any = {
        updated_at: new Date().toISOString(),
    };

    if (data.fieldType !== undefined) updateData.field_type = data.fieldType;
    if (data.label !== undefined) updateData.label = data.label;
    if (data.options !== undefined) updateData.options = data.options;
    if (data.isRequired !== undefined) updateData.is_required = data.isRequired;

    const { error } = await supabase
        .from("reservation_custom_fields")
        .update(updateData)
        .eq("id", data.fieldId);

    if (error) {
        console.error("Error updating custom field:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/reservations");
    return { success: true };
}

// カスタム質問を削除
export async function deleteCustomField(fieldId: string) {
    const supabase = createServiceRoleClient() as any;

    const { error } = await supabase
        .from("reservation_custom_fields")
        .delete()
        .eq("id", fieldId);

    if (error) {
        console.error("Error deleting custom field:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/reservations");
    return { success: true };
}

// カスタム質問の順序を更新
export async function reorderCustomFields(fields: { id: string; sort_order: number }[]) {
    const supabase = createServiceRoleClient() as any;

    for (const field of fields) {
        await supabase
            .from("reservation_custom_fields")
            .update({ sort_order: field.sort_order, updated_at: new Date().toISOString() })
            .eq("id", field.id);
    }

    revalidatePath("/app/reservations");
    return { success: true };
}

// ========================================
// カスタム質問の回答（Custom Answers）関連
// ========================================

export interface CustomAnswer {
    id: string;
    reservation_id: string;
    field_id: string;
    answer_value: string;
    created_at: string;
}

// カスタム質問の回答を取得
export async function getCustomAnswers(reservationId: string) {
    const supabase = createServiceRoleClient() as any;

    const { data, error } = await supabase
        .from("reservation_custom_answers")
        .select(`
            *,
            field:reservation_custom_fields(id, label, field_type, options, is_required)
        `)
        .eq("reservation_id", reservationId);

    if (error) {
        console.error("Error fetching custom answers:", error);
        return { success: false, answers: [], error: error.message };
    }

    return { success: true, answers: data || [] };
}

// カスタム質問の回答を更新
export async function updateCustomAnswers(
    reservationId: string,
    answers: { fieldId: string; value: string }[]
) {
    const supabase = createServiceRoleClient() as any;

    // Delete existing answers
    await supabase
        .from("reservation_custom_answers")
        .delete()
        .eq("reservation_id", reservationId);

    // Insert new answers (only non-empty)
    const answerInserts = answers
        .filter((a) => a.value && a.value.trim() !== "")
        .map((a) => ({
            reservation_id: reservationId,
            field_id: a.fieldId,
            answer_value: a.value,
        }));

    if (answerInserts.length > 0) {
        const { error } = await supabase
            .from("reservation_custom_answers")
            .insert(answerInserts);

        if (error) {
            console.error("Error updating custom answers:", error);
            return { success: false, error: error.message };
        }
    }

    revalidatePath("/app/reservations");
    return { success: true };
}
