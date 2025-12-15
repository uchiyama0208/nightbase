// 勤怠レコードの型定義
export interface AttendanceRecord {
    id: string;
    user_id: string;
    date: string;
    name: string;
    status: "scheduled" | "working" | "finished" | "forgot_clockout";
    start_time: string | null;
    end_time: string | null;
    clock_in: string | null;
    clock_out: string | null;
    pickup_destination: string | null;
}

// タイムカードの型定義
export interface TimeCard {
    id: string;
    user_id: string;
    work_date: string;
    clock_in: string | null;
    clock_out: string | null;
    scheduled_start_time: string | null;
    scheduled_end_time: string | null;
    forgot_clockout?: boolean;
    pickup_destination: string | null;
    created_at?: string;
    updated_at?: string;
}

// ロールフィルターの型定義
export type AttendanceRoleFilter = "cast" | "staff";

// 勤怠データ取得の結果型
export interface AttendanceDataResult {
    redirect?: string;
    data?: {
        allRecords: AttendanceRecord[];
        allProfiles: Array<{
            id: string;
            display_name: string;
            real_name?: string;
            role: string;
            store_id: string;
        }>;
        roleFilter: AttendanceRoleFilter;
    };
}

// 勤怠作成/更新のペイロード
export interface AttendancePayload {
    user_id: string;
    work_date: string;
    clock_in: string | null;
    clock_out: string | null;
    scheduled_start_time?: string | null;
    scheduled_end_time?: string | null;
    pickup_destination: string | null;
}
