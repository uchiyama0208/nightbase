/**
 * Floor actions で使用する共通型定義
 * 注意: このファイルは "use server" ディレクティブを含みません。
 * 定数や型定義は Server Actions 以外からもインポートできます。
 */

// 特別料金の種類
export type SpecialFeeKey = 'set-fee' | 'nomination-fee' | 'companion-fee' | 'extension-fee' | 'douhan-fee';

// 特別料金名のマッピング
export const SPECIAL_FEE_NAMES: Record<SpecialFeeKey, string> = {
    'set-fee': 'セット料金',
    'nomination-fee': '指名料',
    'companion-fee': '場内料金',
    'extension-fee': '延長料金',
    'douhan-fee': '同伴料',
} as const;

// 特別料金名の配列（フィルタリング用）
export const SPECIAL_FEE_NAME_VALUES = Object.values(SPECIAL_FEE_NAMES);

// キャスト料金タイプ
export type CastFeeType = 'nomination' | 'douhan' | 'companion';

// キャスト料金名を取得
export function getCastFeeItemName(feeType: CastFeeType): string {
    switch (feeType) {
        case 'nomination': return '指名料';
        case 'douhan': return '同伴料';
        case 'companion': return '場内料金';
    }
}

// キャスト料金のメニューIDを取得
export function getCastFeeMenuId(feeType: CastFeeType): SpecialFeeKey {
    switch (feeType) {
        case 'nomination': return 'nomination-fee';
        case 'douhan': return 'douhan-fee';
        case 'companion': return 'companion-fee';
    }
}

// オーダー作成時のアイテム
export interface OrderItem {
    menuId: string;
    quantity: number;
    amount: number;
    name?: string;
    startTime?: string | null;
    endTime?: string | null;
}

// オーダー更新時のデータ
export interface OrderUpdateData {
    quantity?: number;
    amount?: number;
    status?: string;
    castId?: string | null;
    guestId?: string | null;
    startTime?: string | null;
    endTime?: string | null;
}

// セッション更新時のデータ
export interface SessionUpdateData {
    tableId?: string | null;
    guestCount?: number;
    startTime?: string;
    endTime?: string | null;
    pricingSystemId?: string | null;
    mainGuestId?: string | null;
}

// API結果の型
export interface ActionResult<T = void> {
    success: boolean;
    data?: T;
    error?: string;
}

// ゲスト/キャストのプロファイル型
export interface ProfileData {
    id: string;
    user_id: string | null;
    store_id: string;
    display_name: string | null;
    role: string;
    avatar_url?: string | null;
}

// セッションゲスト型
export interface SessionGuestData {
    id: string;
    table_session_id: string;
    guest_id: string | null;
    guest_name?: string | null;
    profiles?: ProfileData | null;
}

// オーダー型（V2）
export interface OrderData {
    id: string;
    table_session_id: string;
    menu_id: string | null;
    item_name: string | null;
    quantity: number;
    amount: number;
    status: string;
    cast_id: string | null;
    guest_id: string | null;
    start_time: string | null;
    end_time: string | null;
    cast_status: string | null;
    created_at: string;
    menus?: { name: string; price: number } | null;
    profiles?: ProfileData | null;
}

// セッション型（V2）
export interface SessionDataV2 {
    id: string;
    store_id: string;
    table_id: string | null;
    main_guest_id: string | null;
    guest_count: number;
    start_time: string;
    end_time: string | null;
    status: string;
    pricing_system_id: string | null;
    total_amount: number;
    orders?: OrderData[];
    session_guests?: SessionGuestData[];
    pricing_systems?: PricingSystemData | null;
}

// 料金システム型
export interface PricingSystemData {
    id: string;
    store_id: string;
    name: string;
    set_fee: number;
    set_duration_minutes: number;
    extension_fee: number;
    extension_duration_minutes: number;
    nomination_fee: number;
    nomination_set_duration_minutes: number | null;
    douhan_fee: number;
    douhan_set_duration_minutes: number;
    companion_fee: number;
    companion_set_duration_minutes: number | null;
    is_default: boolean;
}

// 自動料金追加の結果
export interface AutoFeeResult {
    sessionId: string;
    type: string;
    guestId?: string;
    castId?: string;
    amount: number;
}
