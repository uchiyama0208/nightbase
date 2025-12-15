// 順番待ちエントリの型定義
export interface QueueEntry {
    id: string;
    store_id: string;
    guest_name: string;
    contact_value: string;
    contact_type: "email" | "phone";
    party_size: number;
    status: "waiting" | "notified";
    queue_number: number;
    notified_at: string | null;
    created_at: string;
    updated_at?: string;
}

// 順番待ち設定の型定義
export interface QueueSettings {
    queue_enabled: boolean;
    queue_notification_message: string;
}

// ステータスフィルターの型
export type QueueStatusFilter = "all" | "waiting" | "notified";
