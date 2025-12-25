// 順番待ちエントリの型定義
export interface QueueEntry {
    id: string;
    store_id: string;
    guest_name: string;
    contact_value: string;
    contact_type: "email" | "phone";
    party_size: number;
    status: "waiting" | "visited" | "cancelled" | "notified";
    queue_number: number;
    notified_at: string | null;
    created_at: string;
    updated_at?: string;
    nominated_cast_id?: string | null;
    // New separate fields for email and phone
    email?: string | null;
    phone?: string | null;
}

// 連絡先設定の型
export type ContactSetting = "hidden" | "optional" | "required";

// 順番待ち設定の型定義
export interface QueueSettings {
    queue_enabled: boolean;
    queue_notification_message: string;
    queue_email_setting: ContactSetting;
    queue_phone_setting: ContactSetting;
    queue_cast_setting: ContactSetting;
}

// ステータスフィルターの型
export type QueueStatusFilter = "all" | "waiting" | "visited" | "cancelled" | "notified";

// ステータスの型
export type QueueStatus = "waiting" | "visited" | "cancelled" | "notified";
