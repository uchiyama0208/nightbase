// ダッシュボードデータの型定義

// プロフィールの基本型
export interface DashboardProfile {
    id: string;
    role: string;
    invite_status: string | null;
    approval_status: string | null;
    display_name: string | null;
    store_id: string;
    stores?: {
        id: string;
        name: string;
        show_dashboard?: boolean;
        show_attendance?: boolean;
        show_timecard?: boolean;
        show_users?: boolean;
        show_roles?: boolean;
        show_menus?: boolean;
        show_shifts?: boolean;
    };
}

// ランキングアイテムの型
export interface RankingItem {
    name: string;
    sales: number;
}

// タイムカードの型
export interface TimeCardData {
    clock_in: string | null;
}

// 最終出勤情報の型
export interface LastClockInData {
    work_date: string;
    clock_in: string | null;
    clock_out: string | null;
}

// ダッシュボードデータの結果型
export interface DashboardDataResult {
    redirect?: string;
    data?: {
        currentProfile: DashboardProfile;
        storeName: string | null;
        // シフトタブ
        activeCastCount: number;
        activeStaffCount: number;
        scheduledCastCount: number;
        scheduledStaffCount: number;
        currentUserTimeCard: TimeCardData | null;
        lastClockIn: LastClockInData | null;
        nextShiftDate: string | null;
        unsubmittedShiftRequestCount: number;
        pickupRequestCount: number;
        unassignedPickupCount: number;
        // ユーザータブ
        castCount: number;
        staffCount: number;
        guestCount: number;
        partnerCount: number;
        castRolesCount: number;
        staffRolesCount: number;
        pendingInvitationsCount: number;
        pendingJoinRequestsCount: number;
        pendingResumesCount: number;
        // フロアタブ
        tablesCount: number;
        activeTableCount: number;
        activeGuestCount: number;
        unpaidSlipsCount: number;
        menusCount: number;
        activeBottleKeepsCount: number;
        waitingQueueCount: number;
        todayReservationsCount: number;
        lowStockCount: number;
        // 給与タブ
        pricingSystemsCount: number;
        salarySystemsCount: number;
        rankingTop3: RankingItem[];
        todaySales: number;
        todayPayroll: number;
        // コミュニティタブ
        postsCount: number;
        manualsCount: number;
        unreadPostsCount: number;
        unreadManualsCount: number;
        todaySnsPostsCount: number;
        scheduledSnsPostsCount: number;
        enabledFeaturesCount: number;
        disabledFeaturesCount: number;
        aiCredits: number;
    };
}

// 給与計算用の設定型
export interface SalaryBackSettings {
    calculation_type: "fixed" | "total_percent" | "subtotal_percent";
    fixed_amount?: number;
    percentage?: number;
}

// 給与システム設定の型
export interface SalarySystemSettings {
    hourly_settings?: {
        amount: number;
    };
    store_back_settings?: SalaryBackSettings;
    shimei_back_settings?: SalaryBackSettings;
    jounai_back_settings?: SalaryBackSettings;
    douhan_back_settings?: SalaryBackSettings;
}
