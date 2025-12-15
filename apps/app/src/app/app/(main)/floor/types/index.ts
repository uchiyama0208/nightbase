/**
 * フロア画面で使用する型定義
 */

// アクション層の型をre-export
export type {
    ProfileData,
    SessionDataV2,
    SessionGuestData,
    OrderData,
    PricingSystemData,
    CastFeeType,
    SpecialFeeKey,
    OrderItem,
    OrderUpdateData,
    SessionUpdateData,
    ActionResult,
    AutoFeeResult,
} from "../actions/types";

// プロファイル情報の最小型（表示用）
export interface ProfileInfo {
    id: string;
    display_name: string | null;
    avatar_url?: string | null;
}

// キャスト配置情報
export interface CastAssignment {
    id: string;
    cast_id: string;
    guest_id: string;
    status: string;
    grid_x: number | null;
    grid_y: number | null;
    start_time: string;
    end_time: string | null;
    profiles: ProfileInfo;
    guest_profile?: ProfileInfo;
}

// ゲストグループ（ゲストと担当キャストの組）
export interface GuestGroup {
    id: string;
    profile: ProfileInfo;
    casts: CastAssignment[];
}

// 配置待ちの状態
export interface PendingPlacement {
    profile: ProfileInfo;
    mode: "guest" | "cast";
    guestId: string | null;
    assignmentId?: string;
}

// 削除確認モーダル用
export interface DeleteConfirmation {
    id: string;
    name: string;
    type?: "guest" | "cast";
}

// ステータス編集用
export interface StatusEdit {
    id: string;
    name: string;
    currentStatus: string;
}

// キャスト詳細編集用
export interface CastDetailEdit {
    profile: ProfileInfo;
    guestId: string | null;
    gridX: number | null;
    gridY: number | null;
    startTime: string;
    endTime: string;
    status: string;
}

// ユーザーアクションメニュー用
export interface UserActionMenuState {
    orderId?: string;
    guestId: string;
    userId: string;
    userName: string;
    isGuest: boolean;
    profile: ProfileInfo;
}

// タグ選択用
export interface TagSelectionState {
    orderId: string;
    castName: string;
    currentTag: string;
}
