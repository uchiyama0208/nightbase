// ページキーの一覧（権限設定に使用）
export const PAGE_KEYS = [
    // シフト
    "timecard",
    "my-shifts",
    "attendance",
    "shifts",
    "pickup",
    // ユーザー
    "users",
    "users-personal-info",
    "invitations",
    "roles",
    "resumes",
    // フロア
    "floor",
    "slips",
    "menus",
    "bottles",
    "reservations",
    "queue",
    "orders",
    // 店舗
    "sales",
    "payroll",
    "pricing-systems",
    "salary-systems",
    "seats",
    "shopping",
    "settings",
    // コミュニティ
    "board",
    "ranking",
    "sns",
    "ai-create",
    "services",
] as const;

export type PageKey = typeof PAGE_KEYS[number];
export type PermissionLevel = "none" | "view" | "edit";

// 権限の構造
export type PagePermissions = {
    [key in PageKey]?: PermissionLevel;
};

export type RoleFormData = {
    name: string;
    for_role: "staff" | "cast";
    permissions: PagePermissions;
};

// ページの表示名（日本語）
export const PAGE_LABELS: Record<PageKey, string> = {
    attendance: "出勤管理",
    pickup: "送迎管理",
    timecard: "タイムカード",
    shifts: "シフト管理",
    "my-shifts": "マイシフト",
    users: "プロフィール情報",
    "users-personal-info": "└ 個人情報",
    roles: "権限",
    invitations: "招待",
    resumes: "履歴書",
    floor: "フロア管理",
    seats: "席エディター",
    slips: "伝票",
    menus: "メニュー",
    bottles: "ボトルキープ",
    queue: "順番待ち管理",
    reservations: "予約管理",
    shopping: "買い出し",
    orders: "注文一覧",
    sales: "売上",
    payroll: "給与",
    ranking: "ランキング",
    "pricing-systems": "料金システム",
    "salary-systems": "給与システム",
    settings: "設定",
    board: "掲示板",
    sns: "SNS投稿",
    "ai-create": "AIクリエイト",
    services: "関連サービス",
};

// ページをカテゴリごとにグループ化
// ダッシュボードのタブ配置と一致させる
export const PAGE_CATEGORIES = {
    shift: ["timecard", "my-shifts", "attendance", "shifts", "pickup"] as PageKey[],
    user: ["users", "users-personal-info", "invitations", "roles", "resumes"] as PageKey[],
    floor: ["floor", "slips", "menus", "bottles", "reservations", "queue", "orders"] as PageKey[],
    store: ["sales", "payroll", "pricing-systems", "salary-systems", "seats", "shopping"] as PageKey[],
    community: ["board", "ranking", "sns", "ai-create", "services"] as PageKey[],
};

export const CATEGORY_LABELS: Record<keyof typeof PAGE_CATEGORIES, string> = {
    shift: "シフト",
    user: "ユーザー",
    floor: "フロア",
    store: "店舗",
    community: "コミュニティ",
};

// キャストがアクセス可能なページ（権限設定で表示/非表示を切り替えられる）
export const CAST_AVAILABLE_PAGES: PageKey[] = [
    "timecard",
    "my-shifts",
    "ranking",
    "board",
];

// キャスト用のページラベル
export const CAST_PAGE_LABELS: Record<string, string> = {
    timecard: "タイムカード",
    "my-shifts": "マイシフト",
    ranking: "ランキング",
    board: "掲示板",
};
