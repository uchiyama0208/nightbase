"use server";

import { createServerClient } from "@/lib/supabaseServerClient";

// 店舗情報取得（公開用）
export async function getStoreForQueue(storeId: string) {
    const supabase = await createServerClient() as any;

    const { data: store, error } = await supabase
        .from("stores")
        .select("id, name, icon_url, queue_enabled")
        .eq("id", storeId)
        .maybeSingle();

    if (error || !store) {
        return { success: false, error: "店舗が見つかりませんでした" };
    }

    if (!store.queue_enabled) {
        return { success: false, error: "この店舗は順番待ち登録を受け付けていません" };
    }

    return { success: true, store };
}

// 待ち組数を取得
export async function getWaitingCount(storeId: string) {
    const supabase = await createServerClient() as any;

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
    const supabase = await createServerClient() as any;

    const storeId = formData.get("store_id") as string;
    const guestName = formData.get("guest_name") as string;
    const contactType = formData.get("contact_type") as string;
    const contactValue = formData.get("contact_value") as string;
    const partySizeStr = formData.get("party_size") as string;
    const partySize = parseInt(partySizeStr, 10) || 1;

    // バリデーション
    if (!storeId || !guestName || !contactType || !contactValue) {
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

    // 店舗が順番待ちを受け付けているか確認
    const { data: store } = await supabase
        .from("stores")
        .select("id, queue_enabled, day_switch_time")
        .eq("id", storeId)
        .maybeSingle();

    if (!store || !store.queue_enabled) {
        return { success: false, error: "この店舗は順番待ち登録を受け付けていません" };
    }

    // 店舗の切り替え時間を考慮して営業日を計算
    const daySwitchTime = store.day_switch_time || "05:00";
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

    // 順番待ちエントリを作成
    const { data: entry, error: insertError } = await supabase
        .from("queue_entries")
        .insert({
            store_id: storeId,
            guest_name: guestName,
            contact_type: contactType,
            contact_value: contactValue,
            party_size: partySize,
            queue_number: queueNumber,
            status: "waiting",
        })
        .select()
        .single();

    if (insertError) {
        console.error("Queue entry creation error:", insertError);
        return { success: false, error: "登録に失敗しました。しばらく経ってからもう一度お試しください。" };
    }

    return { success: true, queueNumber: entry.queue_number };
}
