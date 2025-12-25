"use server";

import { createServiceRoleClient } from "@/lib/supabaseServerClient";

export type ContactSetting = "hidden" | "optional" | "required";

// 店舗情報取得（公開用）
// 未認証ユーザーからのアクセスのため、Service Role Clientを使用してRLSをバイパス
export async function getStoreForQueue(storeId: string) {
    const supabase = createServiceRoleClient() as any;

    // 店舗基本情報を取得
    const { data: store, error } = await supabase
        .from("stores")
        .select("id, name, icon_url")
        .eq("id", storeId)
        .maybeSingle();

    if (error || !store) {
        return { success: false, error: "店舗が見つかりませんでした" };
    }

    // 店舗設定を取得
    const { data: storeSettings } = await supabase
        .from("store_settings")
        .select("queue_enabled, queue_email_setting, queue_phone_setting, queue_cast_setting")
        .eq("store_id", storeId)
        .maybeSingle();

    if (!storeSettings?.queue_enabled) {
        return { success: false, error: "この店舗は順番待ち登録を受け付けていません" };
    }

    return {
        success: true,
        store: {
            ...store,
            queue_enabled: storeSettings.queue_enabled,
            queue_email_setting: (storeSettings.queue_email_setting || "required") as ContactSetting,
            queue_phone_setting: (storeSettings.queue_phone_setting || "hidden") as ContactSetting,
            queue_cast_setting: (storeSettings.queue_cast_setting || "hidden") as ContactSetting,
        }
    };
}

// キャスト一覧取得（公開用）- 在籍中のみ
export async function getCastsForQueue(storeId: string) {
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

// 待ち組数を取得
export async function getWaitingCount(storeId: string) {
    const supabase = createServiceRoleClient() as any;

    const { count, error } = await supabase
        .from("queue_entries")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("status", "waiting");

    if (error) {
        return { success: false, count: 0 };
    }

    return { success: true, count: count || 0 };
}

// 順番待ち登録
export async function submitQueueEntry(formData: FormData) {
    const supabase = createServiceRoleClient() as any;

    const storeId = formData.get("store_id") as string;
    const guestName = formData.get("guest_name") as string;
    const email = formData.get("email") as string | null;
    const phone = formData.get("phone") as string | null;
    const partySizeStr = formData.get("party_size") as string;
    const partySize = parseInt(partySizeStr, 10) || 1;
    const nominatedCastId = formData.get("nominated_cast_id") as string | null;

    // 店舗設定を取得してバリデーション
    const { data: storeSettings } = await supabase
        .from("store_settings")
        .select("store_id, queue_enabled, day_switch_time, queue_email_setting, queue_phone_setting, queue_cast_setting")
        .eq("store_id", storeId)
        .maybeSingle();

    if (!storeSettings || !storeSettings.queue_enabled) {
        return { success: false, error: "この店舗は順番待ち登録を受け付けていません" };
    }

    const emailSetting = storeSettings.queue_email_setting || "required";
    const phoneSetting = storeSettings.queue_phone_setting || "hidden";
    const castSetting = storeSettings.queue_cast_setting || "hidden";

    // 基本バリデーション
    if (!storeId || !guestName) {
        return { success: false, error: "必須項目を入力してください" };
    }

    // メールアドレスのバリデーション
    if (emailSetting === "required" && !email) {
        return { success: false, error: "メールアドレスを入力してください" };
    }
    if (email && !email.includes("@")) {
        return { success: false, error: "有効なメールアドレスを入力してください" };
    }

    // 電話番号のバリデーション
    if (phoneSetting === "required" && !phone) {
        return { success: false, error: "電話番号を入力してください" };
    }
    if (phone && !/^[\d\-]+$/.test(phone)) {
        return { success: false, error: "有効な電話番号を入力してください" };
    }

    // 連絡先が少なくとも1つは必要（両方hiddenでない場合）
    if (emailSetting !== "hidden" || phoneSetting !== "hidden") {
        if (!email && !phone) {
            return { success: false, error: "連絡先を入力してください" };
        }
    }

    // 指名キャストのバリデーション
    // "none"は「指名なし」を明示的に選択したことを意味するので有効
    // 未選択（空文字やnull）の場合のみエラー
    if (castSetting === "required" && !nominatedCastId) {
        return { success: false, error: "指名キャストを選択してください" };
    }

    // 店舗の切り替え時間を考慮して営業日を計算
    const daySwitchTime = storeSettings.day_switch_time || "05:00";
    const switchHour = parseInt(daySwitchTime.split(":")[0], 10) || 5;
    const switchMinute = parseInt(daySwitchTime.split(":")[1], 10) || 0;

    const now = new Date();
    const jstDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const currentHour = jstDate.getHours();
    const currentMinute = jstDate.getMinutes();

    // 現在時刻が切り替え時間より前の場合は前日の営業日
    if (currentHour < switchHour || (currentHour === switchHour && currentMinute < switchMinute)) {
        jstDate.setDate(jstDate.getDate() - 1);
    }

    const businessDate = jstDate.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");

    // 営業日の切り替え時間をタイムスタンプとして計算
    const businessDayStart = `${businessDate}T${daySwitchTime}:00+09:00`;

    // 次の受付番号を取得（営業日の最大値 + 1）
    const { data: lastEntry } = await supabase
        .from("queue_entries")
        .select("queue_number")
        .eq("store_id", storeId)
        .gte("created_at", businessDayStart)
        .order("queue_number", { ascending: false })
        .limit(1)
        .maybeSingle();

    const queueNumber = (lastEntry?.queue_number || 0) + 1;

    // 後方互換性のためcontact_typeとcontact_valueを設定
    const contactType = email ? "email" : "phone";
    const contactValue = email || phone || "";

    // 順番待ちエントリを作成
    const insertData: any = {
        store_id: storeId,
        guest_name: guestName,
        contact_type: contactType,
        contact_value: contactValue,
        email: email || null,
        phone: phone || null,
        party_size: partySize,
        queue_number: queueNumber,
        status: "waiting",
    };

    if (nominatedCastId && nominatedCastId !== "" && nominatedCastId !== "none") {
        insertData.nominated_cast_id = nominatedCastId;
    }

    const { data: entry, error: insertError } = await supabase
        .from("queue_entries")
        .insert(insertData)
        .select()
        .single();

    if (insertError) {
        console.error("Queue entry creation error:", insertError);
        return { success: false, error: "登録に失敗しました。しばらく経ってからもう一度お試しください。" };
    }

    // Save custom answers if provided
    const customAnswers = formData.get("custom_answers") as string;
    if (customAnswers) {
        try {
            const answers = JSON.parse(customAnswers) as { fieldId: string; value: string }[];
            const answerInserts = answers
                .filter((a) => a.value && a.value.trim() !== "")
                .map((a) => ({
                    queue_entry_id: entry.id,
                    field_id: a.fieldId,
                    answer_value: a.value,
                }));

            if (answerInserts.length > 0) {
                const { error: answersError } = await supabase
                    .from("queue_custom_answers")
                    .insert(answerInserts);

                if (answersError) {
                    console.error("Queue custom answers insert error:", answersError);
                    // Continue anyway - the queue entry itself succeeded
                }
            }
        } catch (e) {
            console.error("Error parsing custom answers:", e);
        }
    }

    return { success: true, queueNumber: entry.queue_number };
}

// Custom field interface for guest-facing form
export interface QueueCustomField {
    id: string;
    store_id: string;
    field_type: "text" | "textarea" | "select" | "checkbox";
    label: string;
    options: string[] | null;
    is_required: boolean;
    sort_order: number;
}

// Get custom fields for a store (public - for guest form)
export async function getQueueCustomFieldsForForm(storeId: string) {
    const supabase = createServiceRoleClient() as any;

    const { data, error } = await supabase
        .from("queue_custom_fields")
        .select("id, store_id, field_type, label, options, is_required, sort_order")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("Error fetching queue custom fields for form:", error);
        return { success: false, fields: [] };
    }

    return { success: true, fields: data as QueueCustomField[] };
}
