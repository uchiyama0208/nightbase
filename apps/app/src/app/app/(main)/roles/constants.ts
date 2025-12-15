// ページキーの一覧（権限設定に使用）
export const PAGE_KEYS = [
    // シフト
    "attendance",
    "pickup",
    "timecard",
    "shifts",
    "my-shifts",
    // ユーザー
    "users",
    "roles",
    "invitations",
    "resumes",
    // フロア
    "floor",
    "seats",
    "slips",
    "menus",
    "bottles",
    "queue",
    "reservations",
    "shopping",
    "orders",
    // 料金給与
    "sales",
    "payroll",
    "ranking",
    "pricing-systems",
    "salary-systems",
    // コミュニティ
    "board",
    "sns",
    "ai-create",
    // 設定
    "settings",
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
    board: "掲示板",
    sns: "SNS",
    "ai-create": "AIクリエイト",
    settings: "店舗設定",
};

// ページをカテゴリごとにグループ化
export const PAGE_CATEGORIES = {
    shift: ["attendance", "pickup", "timecard", "shifts", "my-shifts"] as PageKey[],
    user: ["users", "roles", "invitations", "resumes"] as PageKey[],
    floor: ["floor", "seats", "slips", "menus", "bottles", "queue", "reservations", "shopping", "orders"] as PageKey[],
    salary: ["sales", "payroll", "ranking", "pricing-systems", "salary-systems"] as PageKey[],
    community: ["board", "sns", "ai-create"] as PageKey[],
    settings: ["settings"] as PageKey[],
};

export const CATEGORY_LABELS: Record<keyof typeof PAGE_CATEGORIES, string> = {
    shift: "シフト",
    user: "ユーザー",
    floor: "フロア",
    salary: "料金給与",
    community: "コミュニティ",
    settings: "設定",
};
