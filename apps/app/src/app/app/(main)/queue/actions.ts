"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import type { QueueEntry, QueueSettings } from "./types";
import { getBusinessDayStart } from "./utils";

// Supabaseクライアントの型を拡張（queue_entriesテーブルがtypes/supabase.tsに未定義のため）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientAny = any;

// 順番待ちエントリ一覧を取得
export async function getQueueEntries(
    storeId: string,
    status?: "waiting" | "notified"
): Promise<{ success: boolean; entries: QueueEntry[]; error?: string }> {
    const supabase: SupabaseClientAny = await createServerClient();

    let query = supabase
        .from("queue_entries")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: true });

    if (status) {
        query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching queue entries:", error);
        return { success: false, entries: [], error: error.message };
    }

    return { success: true, entries: data as QueueEntry[] };
}

// エントリを削除
export async function deleteQueueEntry(
    entryId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase: SupabaseClientAny = await createServerClient();

    const { error } = await supabase
        .from("queue_entries")
        .delete()
        .eq("id", entryId);

    if (error) {
        console.error("Error deleting queue entry:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/queue");
    return { success: true };
}

// ステータスを更新（通知済みにする）
export async function markAsNotified(
    entryId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase: SupabaseClientAny = await createServerClient();

    const { error } = await supabase
        .from("queue_entries")
        .update({
            status: "notified",
            notified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", entryId);

    if (error) {
        console.error("Error marking entry as notified:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/queue");
    return { success: true };
}

// 順番待ち設定を取得
export async function getQueueSettings(
    storeId: string
): Promise<{ success: boolean; settings: QueueSettings; error?: string }> {
    const supabase: SupabaseClientAny = await createServerClient();

    const { data, error } = await supabase
        .from("store_settings")
        .select("queue_enabled, queue_notification_message")
        .eq("store_id", storeId)
        .single();

    if (error) {
        console.error("Error fetching queue settings:", error);
        return {
            success: false,
            settings: {
                queue_enabled: false,
                queue_notification_message: "",
            },
            error: error.message,
        };
    }

    return {
        success: true,
        settings: {
            queue_enabled: data.queue_enabled ?? false,
            queue_notification_message:
                data.queue_notification_message ??
                "お待たせいたしました。まもなくご案内できます。",
        },
    };
}

// 順番待ち設定を更新
export async function updateQueueSettings(
    storeId: string,
    settings: QueueSettings
): Promise<{ success: boolean; error?: string }> {
    const supabase: SupabaseClientAny = await createServerClient();

    const { error } = await supabase
        .from("store_settings")
        .update({
            queue_enabled: settings.queue_enabled,
            queue_notification_message: settings.queue_notification_message,
        })
        .eq("store_id", storeId);

    if (error) {
        console.error("Error updating queue settings:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/queue");
    return { success: true };
}

// 管理者用: 順番待ちを追加
export async function addQueueEntry(data: {
    storeId: string;
    guestName: string;
    contactValue: string;
    contactType: "email" | "phone";
    partySize: number;
}): Promise<{ success: boolean; entry?: QueueEntry; error?: string }> {
    const supabase: SupabaseClientAny = await createServerClient();

    // 店舗の切り替え時間を取得
    const { data: storeSettings } = await supabase
        .from("store_settings")
        .select("day_switch_time")
        .eq("store_id", data.storeId)
        .single();

    const daySwitchTime = storeSettings?.day_switch_time || "05:00";
    const businessDayStart = getBusinessDayStart(daySwitchTime);

    // 次の順番番号を取得（店舗ごとの営業日の最大値 + 1）
    const { data: lastEntry } = await supabase
        .from("queue_entries")
        .select("queue_number")
        .eq("store_id", data.storeId)
        .gte("created_at", businessDayStart)
        .order("queue_number", { ascending: false })
        .limit(1)
        .maybeSingle();

    const queueNumber = (lastEntry?.queue_number || 0) + 1;

    const { data: newEntry, error } = await supabase
        .from("queue_entries")
        .insert({
            store_id: data.storeId,
            guest_name: data.guestName,
            contact_value: data.contactValue,
            contact_type: data.contactType,
            party_size: data.partySize,
            queue_number: queueNumber,
            status: "waiting",
        })
        .select()
        .single();

    if (error) {
        console.error("Error adding queue entry:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/queue");
    return { success: true, entry: newEntry as QueueEntry };
}
