"use server";

import { createServiceRoleClient } from "@/lib/supabaseServerClient";

// 公開ページ用に Service Role Client を使用してRLSをバイパス

// 店舗情報取得（公開用）
// 未認証ユーザーからのアクセスのため、Service Role Clientを使用してRLSをバイパス
export async function getStoreForReservation(storeId: string) {
    const supabase = createServiceRoleClient() as any;

    console.log("[getStoreForReservation] storeId:", storeId);

    // 店舗基本情報を取得
    const { data: store, error } = await supabase
        .from("stores")
        .select("id, name, icon_url, closed_days")
        .eq("id", storeId)
        .maybeSingle();

    console.log("[getStoreForReservation] store:", store, "error:", error);

    if (error || !store) {
        return { success: false, error: "店舗が見つかりませんでした" };
    }

    // 店舗設定を取得
    const { data: storeSettings, error: settingsError } = await supabase
        .from("store_settings")
        .select("reservation_enabled, business_start_time, business_end_time, reservation_email_setting, reservation_phone_setting, reservation_cast_selection_enabled")
        .eq("store_id", storeId)
        .maybeSingle();

    console.log("[getStoreForReservation] storeSettings:", storeSettings, "settingsError:", settingsError);

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
            reservation_email_setting: storeSettings.reservation_email_setting ?? "required",
            reservation_phone_setting: storeSettings.reservation_phone_setting ?? "hidden",
            reservation_cast_selection_enabled: storeSettings.reservation_cast_selection_enabled ?? true,
        }
    };
}

// キャスト一覧取得（公開用）- 在籍中のみ
export async function getCastsForReservation(storeId: string) {
    const supabase = createServiceRoleClient() as any;

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

// カスタム質問一覧を取得（公開用）
export interface CustomField {
    id: string;
    store_id: string;
    field_type: "text" | "textarea" | "select" | "checkbox";
    label: string;
    options: string[] | null;
    is_required: boolean;
    sort_order: number;
}

export async function getCustomFieldsForReservation(storeId: string) {
    const supabase = createServiceRoleClient() as any;

    const { data, error } = await supabase
        .from("reservation_custom_fields")
        .select("id, store_id, field_type, label, options, is_required, sort_order")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("Error fetching custom fields:", error);
        return { success: false, fields: [] };
    }

    return { success: true, fields: data as CustomField[] };
}

// 予約登録
export async function submitReservation(formData: FormData) {
    const supabase = createServiceRoleClient() as any;

    const storeId = formData.get("store_id") as string;
    const guestName = formData.get("guest_name") as string;
    const guestNameKana = formData.get("guest_name_kana") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const partySizeStr = formData.get("party_size") as string;
    const partySize = parseInt(partySizeStr, 10) || 1;
    const reservationDate = formData.get("reservation_date") as string;
    const reservationTime = formData.get("reservation_time") as string;
    const nominatedCastId = formData.get("nominated_cast_id") as string | null;

    // バリデーション
    if (!storeId || !guestName || !guestNameKana || !reservationDate || !reservationTime) {
        return { success: false, error: "必須項目を入力してください" };
    }

    // 店舗設定を取得（連絡先の必須設定を確認）
    const { data: storeSettings } = await supabase
        .from("store_settings")
        .select("store_id, reservation_enabled, reservation_email_setting, reservation_phone_setting")
        .eq("store_id", storeId)
        .maybeSingle();

    if (!storeSettings || !storeSettings.reservation_enabled) {
        return { success: false, error: "この店舗は予約を受け付けていません" };
    }

    // メールアドレスの必須チェック
    if (storeSettings.reservation_email_setting === "required" && !email?.trim()) {
        return { success: false, error: "メールアドレスを入力してください" };
    }

    // 電話番号の必須チェック
    if (storeSettings.reservation_phone_setting === "required" && !phone?.trim()) {
        return { success: false, error: "電話番号を入力してください" };
    }

    // メールアドレスの簡易バリデーション
    if (email?.trim() && !email.includes("@")) {
        return { success: false, error: "有効なメールアドレスを入力してください" };
    }

    // 電話番号の簡易バリデーション（数字とハイフンのみ）
    if (phone?.trim() && !/^[\d\-]+$/.test(phone)) {
        return { success: false, error: "有効な電話番号を入力してください" };
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
    // 後方互換性のため、emailがあればcontact_type=email、なければphone
    const contactType = email?.trim() ? "email" : "phone";
    const contactValue = email?.trim() || phone?.trim() || "";

    const insertData: any = {
        store_id: storeId,
        guest_name: guestName,
        guest_name_kana: guestNameKana,
        contact_type: contactType,
        contact_value: contactValue,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
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

    // カスタム質問の回答を保存
    const customAnswers = formData.get("custom_answers") as string;
    if (customAnswers) {
        try {
            const answers = JSON.parse(customAnswers) as { fieldId: string; value: string }[];
            if (answers.length > 0) {
                const answerInserts = answers
                    .filter((a) => a.value && a.value.trim() !== "")
                    .map((a) => ({
                        reservation_id: entry.id,
                        field_id: a.fieldId,
                        answer_value: a.value,
                    }));

                if (answerInserts.length > 0) {
                    const { error: answersError } = await supabase
                        .from("reservation_custom_answers")
                        .insert(answerInserts);

                    if (answersError) {
                        console.error("Custom answers insert error:", answersError);
                        // 予約自体は成功しているので続行
                    }
                }
            }
        } catch (e) {
            console.error("Failed to parse custom answers:", e);
        }
    }

    return { success: true, reservationNumber: entry.reservation_number };
}
