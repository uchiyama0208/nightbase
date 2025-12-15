// ユーザープロフィールの型定義
export interface ProfileBase {
    id: string;
    display_name: string;
    display_name_kana?: string | null;
    real_name?: string | null;
    real_name_kana?: string | null;
    role: string;
    avatar_url?: string | null;
    user_id?: string | null;
}

export interface ProfileFull extends ProfileBase {
    last_name?: string | null;
    first_name?: string | null;
    last_name_kana?: string | null;
    first_name_kana?: string | null;
    zip_code?: string | null;
    prefecture?: string | null;
    city?: string | null;
    street?: string | null;
    building?: string | null;
    birth_date?: string | null;
    phone_number?: string | null;
    emergency_phone_number?: string | null;
    nearest_station?: string | null;
    height?: number | null;
    desired_cast_name?: string | null;
    desired_hourly_wage?: number | null;
    desired_shift_days?: string | null;
    status?: string | null;
    guest_addressee?: string | null;
    guest_receipt_type?: string | null;
    store_id: string;
}

// 関係性の型定義
export interface ProfileRelationship {
    id: string;
    store_id: string;
    source_profile_id: string;
    target_profile_id: string;
    relationship_type: string;
    created_at?: string;
}

// コメントの型定義
export interface ProfileComment {
    id: string;
    store_id: string;
    target_profile_id: string;
    author_profile_id: string;
    content: string;
    created_at: string;
    updated_at: string;
    author?: {
        id: string;
        display_name: string;
        avatar_url?: string | null;
    };
    like_count?: number;
    user_has_liked?: boolean;
}

// 過去在籍店の型定義
export interface PastEmployment {
    id: string;
    profile_id: string;
    store_name: string;
    period?: string | null;
    hourly_wage?: number | null;
    sales_amount?: number | null;
    customer_count?: number | null;
    created_at?: string;
}

// ボトルキープの型定義
export interface BottleKeep {
    id: string;
    menu_id: string;
    opened_at: string;
    expiration_date?: string | null;
    remaining_amount?: number | null;
    status: string;
    memo?: string | null;
    menu_name?: string;
    menu_price?: number;
}

// 給与体系の型定義
export interface SalarySystem {
    id: string;
    name: string;
    target_type: "cast" | "staff";
}

// 編集モーダル用データの型定義
export interface UserEditModalData {
    currentUserProfileId: string;
    allProfiles: ProfileBase[];
    relationships: ProfileRelationship[];
    comments: ProfileComment[];
    bottleKeeps: BottleKeep[];
    pastEmployments: PastEmployment[];
    salarySystems: SalarySystem[];
    assignedSalarySystemIds: string[];
}

// ユーザー一覧取得の結果型
export interface UsersDataResult {
    redirect?: string;
    data?: {
        users: ProfileBase[];
    };
}

// レポートデータの型定義
export interface GuestReportData {
    visitCount: number;
    monthlyVisits: Record<string, number>;
}

export interface CastStaffReportData {
    attendanceCount: number;
    totalWorkMinutes: number;
    monthlyData: Record<string, { count: number; minutes: number }>;
}

export type ProfileReportData = GuestReportData | CastStaffReportData;
