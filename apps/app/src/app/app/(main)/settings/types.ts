// 設定関連の型定義

// タイムカード設定の更新ペイロード
export interface TimecardSettingsPayload {
    show_break_columns: boolean;
    tablet_timecard_enabled: boolean;
    location_check_enabled: boolean;
    latitude: number | null;
    longitude: number | null;
    location_radius: number;
    time_rounding_enabled: boolean;
    time_rounding_method: string;
    time_rounding_minutes: number;
    auto_clockout_enabled: boolean;
    tablet_acceptance_start_time?: string | null;
    tablet_acceptance_end_time?: string | null;
    tablet_allowed_roles?: string[];
    tablet_theme?: string;
}

// 機能設定のペイロード
export interface FeatureSettingsPayload {
    show_dashboard: boolean;
    show_attendance: boolean;
    show_timecard: boolean;
    show_users: boolean;
    show_roles: boolean;
}

// 店舗更新のペイロード
export interface StoreUpdatePayload {
    name: string;
    business_start_time: string | null;
    business_end_time: string | null;
    day_switch_time: string | null;
    industry: string | null;
    prefecture: string | null;
    city: string | null;
    address_line1: string | null;
    address_line2: string | null;
    postal_code: string | null;
    closed_days: string[] | null;
    allow_join_requests: boolean;
    updated_at: string;
}

// 伝票設定のペイロード
export interface SlipSettingsPayload {
    slip_rounding_enabled: boolean;
    slip_rounding_method?: string | null;
    slip_rounding_unit?: number | null;
    updated_at: string;
}

// ジオコーディング結果
export interface GeocodeResult {
    success?: boolean;
    latitude?: number;
    longitude?: number;
    error?: string;
}

// 郵便番号検索結果
export interface PostalCodeSearchResult {
    success?: boolean;
    prefecture?: string;
    city?: string;
    addressLine1?: string;
    error?: string;
}

// 設定データ取得の結果
export interface SettingsDataResult {
    redirect?: string;
    success?: boolean;
}
