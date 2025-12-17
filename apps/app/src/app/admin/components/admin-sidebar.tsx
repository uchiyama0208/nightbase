"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
    LayoutDashboard,
    Users,
    Store,
    Calendar,
    Clock,
    UtensilsCrossed,
    DollarSign,
    FileText,
    MessageSquare,
    Share2,
    Bot,
    ChevronDown,
    Database,
    Shield,
    Newspaper,
    BookOpen,
    FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface AdminSidebarProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface NavSection {
    title: string;
    icon: React.ReactNode;
    items: { label: string; href: string; table: string }[];
}

// カラム名の日本語マッピング
export const COLUMN_LABELS: Record<string, string> = {
    // 共通カラム
    id: "ID",
    created_at: "作成日時",
    updated_at: "更新日時",
    deleted_at: "削除日時",
    // ユーザー関連
    user_id: "ユーザーID",
    email: "メールアドレス",
    password: "パスワード",
    phone: "電話番号",
    current_profile_id: "現在のプロフィールID",
    primary_email: "メインメールアドレス",
    hide_line_friendship_prompt: "LINE友達追加案内を非表示",
    is_admin: "管理者",
    // プロフィール関連
    profile_id: "プロフィールID",
    display_name: "表示名",
    display_name_kana: "表示名(カナ)",
    avatar_url: "アバターURL",
    bio: "自己紹介",
    birthday: "誕生日",
    gender: "性別",
    line_user_id: "LINE ユーザーID",
    line_is_friend: "LINE友達",
    source_profile_id: "元プロフィールID",
    target_profile_id: "対象プロフィールID",
    author_profile_id: "投稿者プロフィールID",
    relationship_type: "関係タイプ",
    real_name: "本名",
    real_name_kana: "本名(カナ)",
    phone_number: "電話番号",
    last_name: "姓",
    first_name: "名",
    last_name_kana: "姓(カナ)",
    first_name_kana: "名(カナ)",
    zip_code: "郵便番号",
    prefecture: "都道府県",
    city: "市区町村",
    street: "町名・番地",
    building: "建物名",
    emergency_phone_number: "緊急連絡先",
    nearest_station: "最寄り駅",
    height: "身長",
    desired_cast_name: "希望源氏名",
    desired_hourly_wage: "希望時給",
    desired_shift_days: "希望出勤日数",
    approval_status: "承認状態",
    invite_token: "招待トークン",
    invite_status: "招待状態",
    invite_expires_at: "招待有効期限",
    invite_password_hash: "招待パスワード",
    is_temporary: "仮登録",
    theme: "テーマ",
    guest_addressee: "宛名",
    guest_receipt_type: "領収書種別",
    // 店舗関連
    store_id: "店舗ID",
    store_name: "店舗名",
    name: "名前",
    address: "住所",
    address_line1: "住所1",
    address_line2: "住所2",
    postal_code: "郵便番号",
    description: "説明",
    logo_url: "ロゴURL",
    icon_url: "アイコンURL",
    cover_image_url: "カバー画像URL",
    opening_time: "開店時間",
    closing_time: "閉店時間",
    business_start_time: "営業開始時刻",
    business_end_time: "営業終了時刻",
    day_switch_time: "日付切替時刻",
    industry: "業種",
    closed_days: "定休日",
    referral_source: "紹介元",
    latitude: "緯度",
    longitude: "経度",
    location_radius: "位置判定半径",
    location_check_enabled: "位置確認有効",
    rotation_time: "ローテーション時間",
    allow_join_requests: "参加申請許可",
    allow_join_by_code: "コードで参加許可",
    allow_join_by_url: "URLで参加許可",
    // 表示設定
    show_dashboard: "ダッシュボード表示",
    show_attendance: "出勤管理表示",
    show_timecard: "タイムカード表示",
    show_users: "ユーザー表示",
    show_roles: "ロール表示",
    show_menus: "メニュー表示",
    show_shifts: "シフト表示",
    show_break_columns: "休憩列表示",
    // タブレット設定
    tablet_timecard_enabled: "タブレット打刻有効",
    tablet_acceptance_start_time: "タブレット受付開始",
    tablet_acceptance_end_time: "タブレット受付終了",
    tablet_allowed_roles: "タブレット許可ロール",
    tablet_theme: "タブレットテーマ",
    // 時間丸め設定
    time_rounding_enabled: "時間丸め有効",
    time_rounding_method: "時間丸め方法",
    time_rounding_minutes: "時間丸め分数",
    slip_rounding_enabled: "伝票丸め有効",
    slip_rounding_method: "伝票丸め方法",
    slip_rounding_unit: "伝票丸め単位",
    auto_clockout_enabled: "自動退勤有効",
    // デフォルト時間
    default_cast_start_time: "キャスト開始時刻",
    default_cast_end_time: "キャスト終了時刻",
    default_staff_start_time: "スタッフ開始時刻",
    default_staff_end_time: "スタッフ終了時刻",
    // ロール関連
    role: "ロール",
    role_id: "ロールID",
    role_name: "ロール名",
    permissions: "権限",
    is_owner: "オーナー",
    is_active: "有効",
    is_system_role: "システムロール",
    joined_at: "参加日",
    // 投稿関連
    title: "タイトル",
    content: "内容",
    body: "本文",
    excerpt: "抜粋",
    status: "ステータス",
    visibility: "公開範囲",
    published_at: "公開日時",
    author_id: "作成者ID",
    created_by: "作成者",
    tag_id: "タグID",
    // シフト関連
    shift_id: "シフトID",
    shift_request_id: "シフト希望ID",
    shift_request_date_id: "シフト希望日ID",
    date: "日付",
    target_date: "対象日",
    start_time: "開始時刻",
    end_time: "終了時刻",
    default_start_time: "デフォルト開始時刻",
    default_end_time: "デフォルト終了時刻",
    preferred_start_time: "希望開始時刻",
    preferred_end_time: "希望終了時刻",
    approved_start_time: "承認開始時刻",
    approved_end_time: "承認終了時刻",
    scheduled_start_time: "予定開始時刻",
    scheduled_end_time: "予定終了時刻",
    break_minutes: "休憩時間(分)",
    break_start: "休憩開始",
    break_end: "休憩終了",
    notes: "備考",
    note: "メモ",
    is_approved: "承認済み",
    approved_by: "承認者",
    approved_at: "承認日時",
    submitted_at: "提出日時",
    year: "年",
    month: "月",
    deadline: "締切",
    target_roles: "対象ロール",
    target_profile_ids: "対象プロフィールID",
    line_notification_sent: "LINE通知済み",
    availability: "出勤可否",
    // シフト自動化
    enabled: "有効",
    period_type: "期間タイプ",
    send_day_offset: "送信日オフセット",
    send_hour: "送信時刻",
    reminder_enabled: "リマインダー有効",
    reminder_day_offset: "リマインダー日オフセット",
    reminder_hour: "リマインダー時刻",
    // 勤怠関連
    clock_in: "出勤時刻",
    clock_out: "退勤時刻",
    clock_in_at: "出勤日時",
    clock_out_at: "退勤日時",
    work_date: "勤務日",
    working_hours: "勤務時間",
    overtime_hours: "残業時間",
    pickup_required: "送迎必要",
    pickup_destination: "送迎先",
    forgot_clockout: "退勤忘れ",
    // 送迎関連
    route_id: "ルートID",
    driver_profile_id: "運転手プロフィールID",
    round_trips: "往復数",
    trip_number: "便番号",
    order_index: "順番",
    // フロア関連
    table_id: "席ID",
    table_name: "席名",
    table_number: "席番号",
    table_type_id: "席タイプID",
    type_id: "タイプID",
    capacity: "定員",
    floor: "フロア",
    position_x: "X座標",
    position_y: "Y座標",
    x: "X座標",
    y: "Y座標",
    width: "幅",
    shape: "形状",
    rotation: "回転",
    layout_data: "レイアウトデータ",
    grid_x: "グリッドX",
    grid_y: "グリッドY",
    // セッション関連
    session_id: "セッションID",
    table_session_id: "セッションID",
    started_at: "開始日時",
    ended_at: "終了日時",
    total_amount: "合計金額",
    guest_count: "来客数",
    main_guest_id: "メインゲストID",
    guest_id: "ゲストID",
    // キャスト関連
    cast_id: "キャストID",
    cast_profile_id: "キャストプロフィールID",
    assignment_type: "指名タイプ",
    // 注文関連
    order_id: "注文ID",
    menu_id: "メニューID",
    quantity: "数量",
    unit_price: "単価",
    amount: "金額",
    subtotal: "小計",
    ordered_at: "注文日時",
    ordered_by: "注文者",
    item_name: "商品名",
    // メニュー関連
    category_id: "カテゴリID",
    category_name: "カテゴリ名",
    price: "価格",
    image_url: "画像URL",
    is_available: "販売中",
    sort_order: "表示順",
    hide_from_slip: "伝票非表示",
    target_type: "対象タイプ",
    cast_back_amount: "キャストバック",
    // ボトル関連
    bottle_id: "ボトルID",
    bottle_keep_id: "ボトルキープID",
    bottle_name: "ボトル名",
    kept_at: "キープ日",
    opened_at: "開栓日",
    expires_at: "有効期限",
    expiration_date: "有効期限",
    remaining_amount: "残量",
    holder_id: "所有者ID",
    holder_name: "所有者名",
    target_bottle_keep_id: "対象ボトルID",
    // 料金関連
    pricing_system_id: "料金システムID",
    base_price: "基本料金",
    hourly_rate: "時間料金",
    hourly_charge: "時間料金",
    extension_rate: "延長料金",
    set_fee: "セット料金",
    set_duration_minutes: "セット時間(分)",
    extension_fee: "延長料金",
    extension_fee_30m: "延長料金(30分)",
    extension_fee_60m: "延長料金(60分)",
    extension_duration_minutes: "延長時間(分)",
    nomination_fee: "指名料",
    nomination_set_duration_minutes: "指名セット時間(分)",
    companion_fee: "同伴料",
    companion_set_duration_minutes: "同伴セット時間(分)",
    shime_fee: "締め料",
    jounai_fee: "場内料",
    service_rate: "サービス料率",
    tax_rate: "税率",
    is_default: "デフォルト",
    // 給与関連
    salary_system_id: "給与システムID",
    base_salary: "基本給",
    hourly_wage: "時給",
    hourly_settings: "時給設定",
    commission_rate: "歩合率",
    store_back_settings: "ストアバック設定",
    jounai_back_settings: "場内バック設定",
    shimei_back_settings: "指名バック設定",
    douhan_back_settings: "同伴バック設定",
    shared_count_type: "共有カウント方式",
    deductions: "控除",
    // 過去の勤務先
    period: "期間",
    sales_amount: "売上金額",
    customer_count: "顧客数",
    // SNS関連
    platform: "プラットフォーム",
    platforms: "プラットフォーム",
    account_id: "アカウントID",
    account_name: "アカウント名",
    access_token: "アクセストークン",
    refresh_token: "リフレッシュトークン",
    token_expires_at: "トークン有効期限",
    is_connected: "接続済み",
    scheduled_at: "予約日時",
    posted_at: "投稿日時",
    template_id: "テンプレートID",
    template_name: "テンプレート名",
    template_type: "テンプレート種別",
    image_style: "画像スタイル",
    instagram_type: "Instagram種別",
    error_message: "エラーメッセージ",
    content_type: "コンテンツ種別",
    schedule_hour: "投稿時刻",
    last_run_at: "最終実行日時",
    // その他
    type: "種類",
    value: "値",
    metadata: "メタデータ",
    settings: "設定",
    config: "設定",
    tags: "タグ",
    is_deleted: "削除済み",
    is_read: "既読",
    read_at: "既読日時",
    liked_at: "いいね日時",
    parent_id: "親ID",
    comment_id: "コメントID",
    post_id: "投稿ID",
    manual_id: "マニュアルID",
    entry_type: "エントリー種別",
    slug: "スラッグ",
    message: "メッセージ",
    response: "回答",
    context: "コンテキスト",
};

// テーブル名の日本語マッピング
export const TABLE_LABELS: Record<string, string> = {
    // ユーザー
    users: "ユーザー",
    profiles: "プロフィール",
    profile_relationships: "プロフィール関係",
    past_employments: "過去の勤務先",
    // 店舗
    stores: "店舗",
    store_roles: "店舗ロール",
    store_posts: "店舗投稿",
    store_manuals: "店舗マニュアル",
    store_manual_tags: "マニュアルタグ",
    // シフト
    shift_requests: "シフト希望",
    shift_request_dates: "シフト希望日",
    shift_submissions: "シフト提出",
    shift_automation_settings: "シフト自動化設定",
    // 勤怠
    work_records: "勤怠記録",
    attendance: "出勤管理",
    pickup_routes: "送迎ルート",
    pickup_passengers: "送迎乗客",
    // フロア
    tables: "席",
    table_types: "席タイプ",
    table_sessions: "セッション",
    cast_assignments: "キャスト指名",
    orders: "注文",
    // メニュー/ボトル
    menus: "メニュー",
    menu_categories: "メニューカテゴリ",
    bottle_keeps: "ボトルキープ",
    bottle_keep_holders: "ボトル所有者",
    // 料金/給与
    pricing_systems: "料金システム",
    salary_systems: "給与システム",
    profile_salary_systems: "給与設定",
    bill_settings: "会計設定",
    // 掲示板
    post_likes: "投稿いいね",
    post_reads: "投稿既読",
    manual_likes: "マニュアルいいね",
    manual_reads: "マニュアル既読",
    manual_tags: "マニュアルタグ",
    // コメント
    comments: "コメント",
    comment_likes: "コメントいいね",
    // SNS
    sns_accounts: "SNSアカウント",
    sns_scheduled_posts: "SNS予約投稿",
    sns_templates: "SNSテンプレート",
    sns_recurring_schedules: "SNS定期投稿",
    // CMS
    cms_entries: "CMSエントリー",
    // AI
    ai_chat_messages: "AIチャット履歴",
};

const navSections: NavSection[] = [
    {
        title: "ユーザー",
        icon: <Users className="h-4 w-4" />,
        items: [
            { label: "ユーザー", href: "/admin/tables/users", table: "users" },
            { label: "プロフィール", href: "/admin/tables/profiles", table: "profiles" },
            { label: "プロフィール関係", href: "/admin/tables/profile_relationships", table: "profile_relationships" },
            { label: "過去の勤務先", href: "/admin/tables/past_employments", table: "past_employments" },
        ],
    },
    {
        title: "店舗",
        icon: <Store className="h-4 w-4" />,
        items: [
            { label: "店舗", href: "/admin/tables/stores", table: "stores" },
            { label: "店舗ロール", href: "/admin/tables/store_roles", table: "store_roles" },
            { label: "店舗投稿", href: "/admin/tables/store_posts", table: "store_posts" },
            { label: "店舗マニュアル", href: "/admin/tables/store_manuals", table: "store_manuals" },
            { label: "マニュアルタグ", href: "/admin/tables/store_manual_tags", table: "store_manual_tags" },
        ],
    },
    {
        title: "シフト",
        icon: <Calendar className="h-4 w-4" />,
        items: [
            { label: "シフト希望", href: "/admin/tables/shift_requests", table: "shift_requests" },
            { label: "シフト希望日", href: "/admin/tables/shift_request_dates", table: "shift_request_dates" },
            { label: "シフト提出", href: "/admin/tables/shift_submissions", table: "shift_submissions" },
            { label: "シフト自動化設定", href: "/admin/tables/shift_automation_settings", table: "shift_automation_settings" },
        ],
    },
    {
        title: "勤怠",
        icon: <Clock className="h-4 w-4" />,
        items: [
            { label: "勤怠記録", href: "/admin/tables/work_records", table: "work_records" },
            { label: "出勤管理", href: "/admin/tables/attendance", table: "attendance" },
            { label: "送迎ルート", href: "/admin/tables/pickup_routes", table: "pickup_routes" },
            { label: "送迎乗客", href: "/admin/tables/pickup_passengers", table: "pickup_passengers" },
        ],
    },
    {
        title: "フロア",
        icon: <UtensilsCrossed className="h-4 w-4" />,
        items: [
            { label: "席", href: "/admin/tables/tables", table: "tables" },
            { label: "席タイプ", href: "/admin/tables/table_types", table: "table_types" },
            { label: "セッション", href: "/admin/tables/table_sessions", table: "table_sessions" },
            { label: "キャスト指名", href: "/admin/tables/cast_assignments", table: "cast_assignments" },
            { label: "注文", href: "/admin/tables/orders", table: "orders" },
        ],
    },
    {
        title: "メニュー/ボトル",
        icon: <UtensilsCrossed className="h-4 w-4" />,
        items: [
            { label: "メニュー", href: "/admin/tables/menus", table: "menus" },
            { label: "メニューカテゴリ", href: "/admin/tables/menu_categories", table: "menu_categories" },
            { label: "ボトルキープ", href: "/admin/tables/bottle_keeps", table: "bottle_keeps" },
            { label: "ボトル所有者", href: "/admin/tables/bottle_keep_holders", table: "bottle_keep_holders" },
        ],
    },
    {
        title: "料金/給与",
        icon: <DollarSign className="h-4 w-4" />,
        items: [
            { label: "料金システム", href: "/admin/tables/pricing_systems", table: "pricing_systems" },
            { label: "給与システム", href: "/admin/tables/salary_systems", table: "salary_systems" },
            { label: "給与設定", href: "/admin/tables/profile_salary_systems", table: "profile_salary_systems" },
            { label: "会計設定", href: "/admin/tables/bill_settings", table: "bill_settings" },
        ],
    },
    {
        title: "掲示板",
        icon: <MessageSquare className="h-4 w-4" />,
        items: [
            { label: "投稿いいね", href: "/admin/tables/post_likes", table: "post_likes" },
            { label: "投稿既読", href: "/admin/tables/post_reads", table: "post_reads" },
            { label: "マニュアルいいね", href: "/admin/tables/manual_likes", table: "manual_likes" },
            { label: "マニュアル既読", href: "/admin/tables/manual_reads", table: "manual_reads" },
            { label: "マニュアルタグ", href: "/admin/tables/manual_tags", table: "manual_tags" },
        ],
    },
    {
        title: "コメント",
        icon: <FileText className="h-4 w-4" />,
        items: [
            { label: "コメント", href: "/admin/tables/comments", table: "comments" },
            { label: "コメントいいね", href: "/admin/tables/comment_likes", table: "comment_likes" },
        ],
    },
    {
        title: "SNS",
        icon: <Share2 className="h-4 w-4" />,
        items: [
            { label: "SNSアカウント", href: "/admin/tables/sns_accounts", table: "sns_accounts" },
            { label: "SNS予約投稿", href: "/admin/tables/sns_scheduled_posts", table: "sns_scheduled_posts" },
            { label: "SNSテンプレート", href: "/admin/tables/sns_templates", table: "sns_templates" },
            { label: "SNS定期投稿", href: "/admin/tables/sns_recurring_schedules", table: "sns_recurring_schedules" },
        ],
    },
    {
        title: "CMS",
        icon: <FileText className="h-4 w-4" />,
        items: [
            { label: "CMSエントリー", href: "/admin/tables/cms_entries", table: "cms_entries" },
        ],
    },
    {
        title: "AI",
        icon: <Bot className="h-4 w-4" />,
        items: [
            { label: "AIチャット履歴", href: "/admin/tables/ai_chat_messages", table: "ai_chat_messages" },
        ],
    },
];

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
    const pathname = usePathname();
    const [expandedSections, setExpandedSections] = useState<string[]>(["ユーザー", "店舗"]);

    const toggleSection = (title: string) => {
        setExpandedSections((prev) =>
            prev.includes(title)
                ? prev.filter((t) => t !== title)
                : [...prev, title]
        );
    };

    return (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                <Shield className="h-6 w-6 text-blue-600" />
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                    Admin
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
                {/* Dashboard Link */}
                <Link
                    href="/admin"
                    onClick={onLinkClick}
                    className={cn(
                        "flex items-center gap-3 px-4 py-2 mx-2 rounded-lg text-sm font-medium transition-colors",
                        pathname === "/admin"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                >
                    <LayoutDashboard className="h-4 w-4" />
                    ダッシュボード
                </Link>

                {/* CMS Section */}
                <div className="mt-4 px-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        CMS
                    </p>
                    <div className="space-y-1">
                        <Link
                            href="/admin/cms/blog"
                            onClick={onLinkClick}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                pathname.startsWith("/admin/cms/blog")
                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                        >
                            <Newspaper className="h-4 w-4" />
                            ブログ
                        </Link>
                        <Link
                            href="/admin/cms/case-studies"
                            onClick={onLinkClick}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                pathname.startsWith("/admin/cms/case-studies")
                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                        >
                            <FileCheck className="h-4 w-4" />
                            導入事例
                        </Link>
                        <Link
                            href="/admin/cms/manuals"
                            onClick={onLinkClick}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                pathname.startsWith("/admin/cms/manuals")
                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                        >
                            <BookOpen className="h-4 w-4" />
                            マニュアル
                        </Link>
                    </div>
                </div>

                {/* Data Tables Section */}
                <div className="mt-4 px-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        データテーブル
                    </p>
                </div>

                <div className="space-y-1">
                    {navSections.map((section) => (
                        <div key={section.title}>
                            <button
                                onClick={() => toggleSection(section.title)}
                                className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                <div className="flex items-center gap-2">
                                    {section.icon}
                                    {section.title}
                                </div>
                                <ChevronDown
                                    className={cn(
                                        "h-4 w-4 transition-transform",
                                        expandedSections.includes(section.title) && "rotate-180"
                                    )}
                                />
                            </button>
                            {expandedSections.includes(section.title) && (
                                <div className="ml-6 space-y-1">
                                    {section.items.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={onLinkClick}
                                            className={cn(
                                                "block px-4 py-1.5 text-xs font-mono rounded-md transition-colors",
                                                pathname === item.href
                                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                            )}
                                        >
                                            {item.label}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </nav>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Database className="h-3 w-3" />
                    <span>42 tables</span>
                </div>
            </div>
        </div>
    );
}

export function AdminSidebar({ open, onOpenChange }: AdminSidebarProps) {
    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-72 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar */}
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="left" className="w-72 p-0 bg-white dark:bg-gray-800">
                    <VisuallyHidden>
                        <SheetTitle>管理メニュー</SheetTitle>
                    </VisuallyHidden>
                    <SidebarContent onLinkClick={() => onOpenChange(false)} />
                </SheetContent>
            </Sheet>
        </>
    );
}
