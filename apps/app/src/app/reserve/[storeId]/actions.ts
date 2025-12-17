"use server";

import { createServerClient } from "@/lib/supabaseServerClient";

// 店舗情報取得（公開用）
export async function getStoreForReservation(storeId: string) {
    const supabase = await createServerClient() as any;

    // 店舗基本情報を取得
    const { data: store, error } = await supabase
        .from("stores")
        .select("id, name, icon_url, closed_days")
        .eq("id", storeId)
        .maybeSingle();

    if (error || !store) {
        return { success: false, error: "店舗が見つかりませんでした" };
    }

    // 店舗設定を取得
    const { data: storeSettings } = await supabase
        .from("store_settings")
        .select("reservation_enabled, business_start_time, business_end_time")
        .eq("store_id", storeId)
        .maybeSingle();

    if (!storeSettings?.reservation_enabled) {
        return { success: false, error: "この店舗は予約を受け付けていません" };
    }

    return {
        success: true,
        store: {
            ...store,
            reservation_enabled: storeSettings.reservation_enabled,
            business_start_time: storeSettings.business_start_time,
            business_end_time: storeSettings.business_end_time,
        }
    };
}

// キャスト一覧取得（公開用）- 在籍中のみ
export async function getCastsForReservation(storeId: string) {
    const supabase = await createServerClient() as any;

    const { data: casts, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("store_id", storeId)
        .eq("role", "cast")
        .eq("status", "在籍中")
        .order("display_name", { ascending: true });

    if (error) {
        return { success: false, casts: [] };
    }

    return { success: true, casts: casts || [] };
}

// 予約登録
export async function submitReservation(formData: FormData) {
    const supabase = await createServerClient() as any;

    const storeId = formData.get("store_id") as string;
    const guestName = formData.get("guest_name") as string;
    const guestNameKana = formData.get("guest_name_kana") as string;
    const contactType = formData.get("contact_type") as string;
    const contactValue = formData.get("contact_value") as string;
    const partySizeStr = formData.get("party_size") as string;
    const partySize = parseInt(partySizeStr, 10) || 1;
    const reservationDate = formData.get("reservation_date") as string;
    const reservationTime = formData.get("reservation_time") as string;
    const nominatedCastId = formData.get("nominated_cast_id") as string | null;

    // バリデーション
    if (!storeId || !guestName || !guestNameKana || !contactType || !contactValue || !reservationDate || !reservationTime) {
        return { success: false, error: "必須項目を入力してください" };
    }

    if (contactType !== "email" && contactType !== "phone") {
        return { success: false, error: "連絡先の種類が不正です" };
    }

    // メールアドレスの簡易バリデーション
    if (contactType === "email" && !contactValue.includes("@")) {
        return { success: false, error: "有効なメールアドレスを入力してください" };
    }

    // 電話番号の簡易バリデーション（数字とハイフンのみ）
    if (contactType === "phone" && !/^[\d\-]+$/.test(contactValue)) {
        return { success: false, error: "有効な電話番号を入力してください" };
    }

    // 店舗が予約を受け付けているか確認
    const { data: storeSettings } = await supabase
        .from("store_settings")
        .select("store_id, reservation_enabled")
        .eq("store_id", storeId)
        .maybeSingle();

    if (!storeSettings || !storeSettings.reservation_enabled) {
        return { success: false, error: "この店舗は予約を受け付けていません" };
    }

    // 次の予約番号を取得（今日の最大値 + 1）
    const today = new Date().toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");

    const { data: lastEntry } = await supabase
        .from("reservations")
        .select("reservation_number")
        .eq("store_id", storeId)
        .gte("created_at", `${today}T00:00:00+09:00`)
        .order("reservation_number", { ascending: false })
        .limit(1)
        .maybeSingle();

    const reservationNumber = (lastEntry?.reservation_number || 0) + 1;

    // 予約エントリを作成
    const insertData: any = {
        store_id: storeId,
        guest_name: guestName,
        guest_name_kana: guestNameKana,
        contact_type: contactType,
        contact_value: contactValue,
        party_size: partySize,
        reservation_date: reservationDate,
        reservation_time: reservationTime,
        reservation_number: reservationNumber,
        status: "waiting",
    };

    if (nominatedCastId && nominatedCastId !== "" && nominatedCastId !== "none") {
        insertData.nominated_cast_id = nominatedCastId;
    }

    const { data: entry, error: insertError } = await supabase
        .from("reservations")
        .insert(insertData)
        .select()
        .single();

    if (insertError) {
        console.error("Reservation creation error:", insertError);
        return { success: false, error: "登録に失敗しました。しばらく経ってからもう一度お試しください。" };
    }

    return { success: true, reservationNumber: entry.reservation_number };
}
