"use server";

import { createServerClient, createServiceRoleClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import type { QueueEntry, QueueSettings } from "./types";
import { getBusinessDayStart } from "./utils";
import { getAppData } from "../../data-access";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { sendQueueNotificationEmail } from "@/lib/notifications/email";

/**
 * 順番待ちページ用のデータを取得
 */
export async function getQueuePageData() {
    const { profile } = await getAppData();

    if (!profile?.store_id) {
        throw new Error("No store found");
    }

    const supabase = await createServerClient() as any;

    // 店舗情報を取得
    const { data: store } = await supabase
        .from("stores")
        .select("name, day_switch_time")
        .eq("id", profile.store_id)
        .maybeSingle();

    // 順番待ちエントリと設定を並列取得
    const [entriesResult, settingsResult] = await Promise.all([
        getQueueEntries(profile.store_id),
        getQueueSettings(profile.store_id),
    ]);

    return {
        storeId: profile.store_id,
        storeName: store?.name || "",
        entries: entriesResult.entries,
        settings: settingsResult.settings,
        daySwitchTime: store?.day_switch_time || "05:00",
    };
}

// 順番待ちエントリ一覧を取得
export async function getQueueEntries(
    storeId: string,
    status?: "waiting" | "notified"
): Promise<{ success: boolean; entries: QueueEntry[]; error?: string }> {
    const supabase = await createServerClient();

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
    const supabase = await createServerClient();

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
    const supabase = await createServerClient() as any;

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
    const supabase = await createServerClient() as any;

    const { data, error } = await supabase
        .from("store_settings")
        .select("queue_enabled, queue_notification_message, queue_email_setting, queue_phone_setting, queue_cast_setting")
        .eq("store_id", storeId)
        .single();

    if (error) {
        console.error("Error fetching queue settings:", error);
        return {
            success: false,
            settings: {
                queue_enabled: false,
                queue_notification_message: "",
                queue_email_setting: "optional",
                queue_phone_setting: "optional",
                queue_cast_setting: "hidden",
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
            queue_email_setting: data.queue_email_setting ?? "optional",
            queue_phone_setting: data.queue_phone_setting ?? "optional",
            queue_cast_setting: data.queue_cast_setting ?? "hidden",
        },
    };
}

// 順番待ち設定を更新
export async function updateQueueSettings(
    storeId: string,
    settings: Partial<QueueSettings>
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient() as any;

    const updateData: any = { store_id: storeId };
    if (settings.queue_enabled !== undefined) updateData.queue_enabled = settings.queue_enabled;
    if (settings.queue_notification_message !== undefined) updateData.queue_notification_message = settings.queue_notification_message;
    if (settings.queue_email_setting !== undefined) updateData.queue_email_setting = settings.queue_email_setting;
    if (settings.queue_phone_setting !== undefined) updateData.queue_phone_setting = settings.queue_phone_setting;
    if (settings.queue_cast_setting !== undefined) updateData.queue_cast_setting = settings.queue_cast_setting;

    const { error } = await supabase
        .from("store_settings")
        .upsert(updateData, {
            onConflict: "store_id",
        });

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
    email?: string;
    phone?: string;
    nominatedCastId?: string;
    customAnswers?: { fieldId: string; value: string }[];
}): Promise<{ success: boolean; entry?: QueueEntry; error?: string }> {
    const supabase = createServiceRoleClient() as any;

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

    const insertData: any = {
        store_id: data.storeId,
        guest_name: data.guestName,
        contact_value: data.contactValue,
        contact_type: data.contactType,
        party_size: data.partySize,
        queue_number: queueNumber,
        status: "waiting",
    };

    // Add optional fields if provided
    if (data.email) insertData.email = data.email;
    if (data.phone) insertData.phone = data.phone;
    if (data.nominatedCastId) insertData.nominated_cast_id = data.nominatedCastId;

    const { data: newEntry, error } = await supabase
        .from("queue_entries")
        .insert(insertData)
        .select()
        .single();

    if (error) {
        console.error("Error adding queue entry:", error);
        return { success: false, error: error.message };
    }

    // Save custom answers if provided
    if (data.customAnswers && data.customAnswers.length > 0) {
        const answerInserts = data.customAnswers
            .filter((a) => a.value && a.value.trim() !== "")
            .map((a) => ({
                queue_entry_id: newEntry.id,
                field_id: a.fieldId,
                answer_value: a.value,
            }));

        if (answerInserts.length > 0) {
            await supabase.from("queue_custom_answers").insert(answerInserts);
        }
    }

    revalidatePath("/app/queue");
    return { success: true, entry: newEntry as QueueEntry };
}

// ========================================
// Queue Custom Fields (Custom Questions)
// ========================================

export interface QueueCustomField {
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

export interface QueueCustomAnswer {
    id: string;
    queue_entry_id: string;
    field_id: string;
    answer_value: string;
    created_at: string;
}

// Get custom fields for a store
export async function getQueueCustomFields(storeId: string) {
    const supabase = createServiceRoleClient() as any;

    const { data, error } = await supabase
        .from("queue_custom_fields")
        .select("*")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("Error fetching queue custom fields:", error);
        return { success: false, fields: [], error: error.message };
    }

    return { success: true, fields: data as QueueCustomField[] };
}

// Create a custom field
export async function createQueueCustomField(data: {
    storeId: string;
    fieldType: "text" | "textarea" | "select" | "checkbox";
    label: string;
    options?: string[];
    isRequired: boolean;
}) {
    const supabase = createServiceRoleClient() as any;

    // Get current max sort_order
    const { data: lastField } = await supabase
        .from("queue_custom_fields")
        .select("sort_order")
        .eq("store_id", data.storeId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

    const nextSortOrder = (lastField?.sort_order ?? -1) + 1;

    const { data: newField, error } = await supabase
        .from("queue_custom_fields")
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
        console.error("Error creating queue custom field:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/queue");
    return { success: true, field: newField as QueueCustomField };
}

// Update a custom field
export async function updateQueueCustomField(data: {
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
        .from("queue_custom_fields")
        .update(updateData)
        .eq("id", data.fieldId);

    if (error) {
        console.error("Error updating queue custom field:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/queue");
    return { success: true };
}

// Delete a custom field
export async function deleteQueueCustomField(fieldId: string) {
    const supabase = createServiceRoleClient() as any;

    const { error } = await supabase
        .from("queue_custom_fields")
        .delete()
        .eq("id", fieldId);

    if (error) {
        console.error("Error deleting queue custom field:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/queue");
    return { success: true };
}

// Get custom answers for a queue entry
export async function getQueueCustomAnswers(queueEntryId: string) {
    const supabase = createServiceRoleClient() as any;

    const { data, error } = await supabase
        .from("queue_custom_answers")
        .select(`
            *,
            field:queue_custom_fields(id, label, field_type)
        `)
        .eq("queue_entry_id", queueEntryId);

    if (error) {
        console.error("Error fetching queue custom answers:", error);
        return { success: false, answers: [], error: error.message };
    }

    return { success: true, answers: data || [] };
}

// ========================================
// Queue Entry Detail & Update
// ========================================

// Get queue entry detail with custom answers
export async function getQueueEntryDetail(entryId: string) {
    const supabase = createServiceRoleClient() as any;

    const { data: entry, error } = await supabase
        .from("queue_entries")
        .select(`
            *,
            nominated_cast:profiles!queue_entries_nominated_cast_id_fkey(id, display_name)
        `)
        .eq("id", entryId)
        .single();

    if (error) {
        console.error("Error fetching queue entry detail:", error);
        return { success: false, entry: null, error: error.message };
    }

    // Get custom answers
    const { data: answers } = await supabase
        .from("queue_custom_answers")
        .select(`
            *,
            field:queue_custom_fields(id, label, field_type, options)
        `)
        .eq("queue_entry_id", entryId);

    return {
        success: true,
        entry: entry as QueueEntry & { nominated_cast?: { id: string; display_name: string } | null },
        answers: answers || [],
    };
}

// Update queue entry
export async function updateQueueEntry(data: {
    entryId: string;
    guestName: string;
    partySize: number;
    email?: string | null;
    phone?: string | null;
    nominatedCastId?: string | null;
    status?: "waiting" | "notified" | "visited" | "cancelled";
}) {
    const supabase = createServiceRoleClient() as any;

    const updateData: any = {
        guest_name: data.guestName,
        party_size: data.partySize,
        updated_at: new Date().toISOString(),
    };

    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.nominatedCastId !== undefined) updateData.nominated_cast_id = data.nominatedCastId;
    if (data.status !== undefined) updateData.status = data.status;

    // Update contact_value and contact_type for backwards compatibility
    if (data.email) {
        updateData.contact_value = data.email;
        updateData.contact_type = "email";
    } else if (data.phone) {
        updateData.contact_value = data.phone;
        updateData.contact_type = "phone";
    }

    const { error } = await supabase
        .from("queue_entries")
        .update(updateData)
        .eq("id", data.entryId);

    if (error) {
        console.error("Error updating queue entry:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/queue");
    return { success: true };
}

// Update custom answers for a queue entry
export async function updateQueueCustomAnswers(
    entryId: string,
    answers: { fieldId: string; value: string }[]
) {
    const supabase = createServiceRoleClient() as any;

    // Delete existing answers
    await supabase
        .from("queue_custom_answers")
        .delete()
        .eq("queue_entry_id", entryId);

    // Insert new answers (only non-empty)
    const answerInserts = answers
        .filter((a) => a.value && a.value.trim() !== "")
        .map((a) => ({
            queue_entry_id: entryId,
            field_id: a.fieldId,
            answer_value: a.value,
        }));

    if (answerInserts.length > 0) {
        const { error } = await supabase
            .from("queue_custom_answers")
            .insert(answerInserts);

        if (error) {
            console.error("Error updating queue custom answers:", error);
            return { success: false, error: error.message };
        }
    }

    return { success: true };
}

// Get casts for queue (for nomination selection)
export async function getCastsForQueue(storeId: string) {
    const supabase = createServiceRoleClient() as any;

    const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, status")
        .eq("store_id", storeId)
        .eq("role", "cast")
        .order("display_name");

    if (error) {
        console.error("Error fetching casts for queue:", error);
        return { success: false, casts: [] };
    }

    return { success: true, casts: data || [] };
}

// Send notification email to queue entry
export async function sendQueueNotification(entryId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient() as any;

    // Get entry details
    const { data: entry, error: entryError } = await supabase
        .from("queue_entries")
        .select("*, store:stores(id, name)")
        .eq("id", entryId)
        .single();

    if (entryError || !entry) {
        console.error("Error fetching queue entry for notification:", entryError);
        return { success: false, error: "エントリが見つかりません" };
    }

    const email = entry.email || entry.contact_value;
    if (!email || entry.contact_type === "phone") {
        return { success: false, error: "メールアドレスが設定されていません" };
    }

    // Get notification message from settings
    const { data: settings } = await supabase
        .from("store_settings")
        .select("queue_notification_message")
        .eq("store_id", entry.store_id)
        .single();

    const customMessage = settings?.queue_notification_message || "お待たせいたしました。まもなくご案内できます。";

    // Send email
    const result = await sendQueueNotificationEmail({
        to: email,
        storeName: entry.store?.name || "",
        guestName: entry.guest_name || "",
        customMessage,
    });

    if (!result.success) {
        return { success: false, error: result.error };
    }

    // Update status to notified
    await supabase
        .from("queue_entries")
        .update({
            status: "notified",
            notified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", entryId);

    revalidatePath("/app/queue");
    return { success: true };
}
