/**
 * アプリケーション全体で使用する定数定義
 */

// ============================================
// ロール定義
// ============================================

/** ロールタイプの定数 */
export const ROLE_TYPES = {
    ADMIN: "admin",
    STAFF: "staff",
    CAST: "cast",
    GUEST: "guest",
    PARTNER: "partner",
} as const;

export type RoleType = (typeof ROLE_TYPES)[keyof typeof ROLE_TYPES];

/** スタッフロール（管理権限を持つロール） */
export const STAFF_ROLES = [ROLE_TYPES.ADMIN, ROLE_TYPES.STAFF] as const;

/** キャストと判定するロール */
export const CAST_ROLES = [ROLE_TYPES.CAST] as const;

// ============================================
// 特別料金定義
// ============================================

/** 特別料金の種類 */
export const SPECIAL_FEE_KEYS = {
    SET_FEE: "set-fee",
    NOMINATION_FEE: "nomination-fee",
    COMPANION_FEE: "companion-fee",
    EXTENSION_FEE: "extension-fee",
    DOUHAN_FEE: "douhan-fee",
} as const;

export type SpecialFeeKey = (typeof SPECIAL_FEE_KEYS)[keyof typeof SPECIAL_FEE_KEYS];

/** 特別料金名のマッピング */
export const SPECIAL_FEE_NAMES: Record<SpecialFeeKey, string> = {
    [SPECIAL_FEE_KEYS.SET_FEE]: "セット料金",
    [SPECIAL_FEE_KEYS.NOMINATION_FEE]: "指名料",
    [SPECIAL_FEE_KEYS.COMPANION_FEE]: "場内料金",
    [SPECIAL_FEE_KEYS.EXTENSION_FEE]: "延長料金",
    [SPECIAL_FEE_KEYS.DOUHAN_FEE]: "同伴料",
} as const;

/** 特別料金名の配列（フィルタリング用） */
export const SPECIAL_FEE_NAME_VALUES = Object.values(SPECIAL_FEE_NAMES);

/** キャスト料金タイプ */
export const CAST_FEE_TYPES = {
    NOMINATION: "nomination",
    DOUHAN: "douhan",
    COMPANION: "companion",
} as const;

export type CastFeeType = (typeof CAST_FEE_TYPES)[keyof typeof CAST_FEE_TYPES];

/** キャスト料金名を取得 */
export function getCastFeeItemName(feeType: CastFeeType): string {
    switch (feeType) {
        case CAST_FEE_TYPES.NOMINATION:
            return "指名料";
        case CAST_FEE_TYPES.DOUHAN:
            return "同伴料";
        case CAST_FEE_TYPES.COMPANION:
            return "場内料金";
    }
}

/** キャスト料金のメニューIDを取得 */
export function getCastFeeMenuId(feeType: CastFeeType): SpecialFeeKey {
    switch (feeType) {
        case CAST_FEE_TYPES.NOMINATION:
            return SPECIAL_FEE_KEYS.NOMINATION_FEE;
        case CAST_FEE_TYPES.DOUHAN:
            return SPECIAL_FEE_KEYS.DOUHAN_FEE;
        case CAST_FEE_TYPES.COMPANION:
            return SPECIAL_FEE_KEYS.COMPANION_FEE;
    }
}

// ============================================
// 勤怠ステータス
// ============================================

/** 勤怠ステータスの定数 */
export const ATTENDANCE_STATUS = {
    SCHEDULED: "scheduled",
    WORKING: "working",
    FINISHED: "finished",
    FORGOT_CLOCKOUT: "forgot_clockout",
} as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS];

// ============================================
// 順番待ち・予約ステータス
// ============================================

/** 順番待ちステータス */
export const QUEUE_STATUS = {
    WAITING: "waiting",
    NOTIFIED: "notified",
} as const;

export type QueueStatus = (typeof QUEUE_STATUS)[keyof typeof QUEUE_STATUS];

/** 予約ステータス */
export const RESERVATION_STATUS = {
    WAITING: "waiting",
    VISITED: "visited",
    CANCELLED: "cancelled",
} as const;

export type ReservationStatus = (typeof RESERVATION_STATUS)[keyof typeof RESERVATION_STATUS];

// ============================================
// 連絡先タイプ
// ============================================

/** 連絡先タイプ */
export const CONTACT_TYPES = {
    EMAIL: "email",
    PHONE: "phone",
} as const;

export type ContactType = (typeof CONTACT_TYPES)[keyof typeof CONTACT_TYPES];

// ============================================
// 伝票ステータス
// ============================================

/** 伝票ステータス */
export const SLIP_STATUS = {
    ACTIVE: "active",
    PAID: "paid",
    CANCELLED: "cancelled",
} as const;

export type SlipStatus = (typeof SLIP_STATUS)[keyof typeof SLIP_STATUS];

// ============================================
// 給与計算タイプ
// ============================================

/** 給与計算タイプ */
export const SALARY_CALCULATION_TYPES = {
    FIXED: "fixed",
    TOTAL_PERCENT: "total_percent",
    SUBTOTAL_PERCENT: "subtotal_percent",
} as const;

export type SalaryCalculationType = (typeof SALARY_CALCULATION_TYPES)[keyof typeof SALARY_CALCULATION_TYPES];

// ============================================
// デフォルト値
// ============================================

/** デフォルトの丸め設定 */
export const DEFAULT_ROUNDING = {
    METHOD: "round",
    MINUTES: 15,
    UNIT: 10,
} as const;

/** デフォルトの位置情報設定 */
export const DEFAULT_LOCATION = {
    RADIUS: 50,
} as const;

// ============================================
// バリデーション用
// ============================================

/** 許可される丸め単位 */
export const ALLOWED_ROUNDING_UNITS = [10, 100, 1000, 10000] as const;

/** 許可される丸め方法 */
export const ALLOWED_ROUNDING_METHODS = ["round", "ceil", "floor"] as const;

export type RoundingMethod = (typeof ALLOWED_ROUNDING_METHODS)[number];
