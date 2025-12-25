"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    RefreshCw,
    Download,
    MoreHorizontal,
    Filter,
    X,
    ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { TABLE_LABELS, COLUMN_LABELS } from "../../components/admin-sidebar";

const PAGE_SIZE = 20;

// 日時カラムを検出（ISO 8601形式: 2024-01-01T12:00:00Z）
const DATETIME_COLUMNS = [
    "created_at", "updated_at", "clock_in", "clock_out",
    "start_time", "end_time", "check_in_time", "check_out_time",
    "break_start", "break_end", "scheduled_start_time", "scheduled_end_time",
    "published_at", "last_run_at", "token_expires_at", "scheduled_at",
    "approved_start_time", "approved_end_time", "preferred_start_time", "preferred_end_time",
    "default_start_time", "default_end_time", "opened_at", "read_at",
];

// 日付のみカラムを検出（YYYY-MM-DD形式）
const DATE_COLUMNS = [
    "work_date", "expiration_date", "target_date", "date", "deadline",
];

// UTC ISO文字列をローカルのdatetime-local形式に変換（JST表示用）
function utcToLocalDatetime(utcString: string | null): string {
    if (!utcString) return "";
    try {
        const date = new Date(utcString);
        if (isNaN(date.getTime())) return "";
        // JST用にローカル形式で返す
        const jstDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
        const year = jstDate.getFullYear();
        const month = String(jstDate.getMonth() + 1).padStart(2, "0");
        const day = String(jstDate.getDate()).padStart(2, "0");
        const hours = String(jstDate.getHours()).padStart(2, "0");
        const minutes = String(jstDate.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
        return "";
    }
}

// ローカルのdatetime-local値をUTC ISO文字列に変換（Supabase保存用）
function localDatetimeToUtc(localString: string): string | null {
    if (!localString) return null;
    try {
        // datetime-local形式: "2024-01-01T12:00"
        // これをJSTとして解釈してUTCに変換
        const [datePart, timePart] = localString.split("T");
        const [year, month, day] = datePart.split("-").map(Number);
        const [hours, minutes] = timePart.split(":").map(Number);

        // JSTの日時を作成（日本時間として）
        const jstDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
        // JSTからUTCに変換（-9時間）
        const utcDate = new Date(jstDate.getTime() - 9 * 60 * 60 * 1000);
        return utcDate.toISOString();
    } catch {
        return null;
    }
}

// 値が日時かどうか判定
function isDateTimeColumn(columnName: string, value: any): boolean {
    if (DATETIME_COLUMNS.includes(columnName)) return true;
    // 値からも判定（ISO 8601形式）
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
        return true;
    }
    return false;
}

// 値が日付のみかどうか判定
function isDateColumn(columnName: string, value: any): boolean {
    if (DATE_COLUMNS.includes(columnName)) return true;
    // 値からも判定（YYYY-MM-DD形式のみ）
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return true;
    }
    return false;
}

// リレーション設定: カラム名 -> { table: 参照テーブル, displayColumn: 表示カラム, secondaryColumn?: サブ表示 }
const RELATION_CONFIG: Record<string, { table: string; displayColumn: string; secondaryColumn?: string }> = {
    // ユーザー・プロフィール関連
    user_id: { table: "profiles", displayColumn: "display_name", secondaryColumn: "role" },
    profile_id: { table: "profiles", displayColumn: "display_name", secondaryColumn: "role" },
    cast_id: { table: "profiles", displayColumn: "display_name" },
    guest_id: { table: "profiles", displayColumn: "display_name" },
    driver_profile_id: { table: "profiles", displayColumn: "display_name" },
    cast_profile_id: { table: "profiles", displayColumn: "display_name" },
    source_profile_id: { table: "profiles", displayColumn: "display_name" },
    target_profile_id: { table: "profiles", displayColumn: "display_name" },
    author_profile_id: { table: "profiles", displayColumn: "display_name" },
    main_guest_id: { table: "profiles", displayColumn: "display_name" },
    created_by: { table: "profiles", displayColumn: "display_name" },
    current_profile_id: { table: "profiles", displayColumn: "display_name" },
    // 店舗関連
    store_id: { table: "stores", displayColumn: "name" },
    // テーブル・席関連
    table_id: { table: "tables", displayColumn: "name" },
    type_id: { table: "table_types", displayColumn: "name" },
    table_session_id: { table: "table_sessions", displayColumn: "id" },
    // メニュー関連
    menu_id: { table: "menus", displayColumn: "name", secondaryColumn: "price" },
    category_id: { table: "menu_categories", displayColumn: "name" },
    // ボトル関連
    bottle_keep_id: { table: "bottle_keeps", displayColumn: "id" },
    target_bottle_keep_id: { table: "bottle_keeps", displayColumn: "id" },
    // 料金・給与関連
    pricing_system_id: { table: "pricing_systems", displayColumn: "name" },
    salary_system_id: { table: "salary_systems", displayColumn: "name" },
    // シフト関連
    shift_request_id: { table: "shift_requests", displayColumn: "title" },
    // 送迎関連
    route_id: { table: "pickup_routes", displayColumn: "date" },
    // 投稿・マニュアル関連
    post_id: { table: "store_posts", displayColumn: "title" },
    manual_id: { table: "store_manuals", displayColumn: "title" },
    comment_id: { table: "comments", displayColumn: "content" },
    tag_id: { table: "manual_tags", displayColumn: "name" },
    template_id: { table: "sns_templates", displayColumn: "name" },
};

// ブール値のカラム別表示ラベル: { true: 真の表示, false: 偽の表示 }
const BOOLEAN_LABELS: Record<string, { true: string; false: string }> = {
    // 有効・無効系
    is_active: { true: "有効", false: "無効" },
    is_enabled: { true: "有効", false: "無効" },
    enabled: { true: "有効", false: "無効" },
    is_connected: { true: "接続済み", false: "未接続" },
    // 管理者・権限系
    is_admin: { true: "管理者", false: "一般" },
    is_system_role: { true: "システム", false: "カスタム" },
    // デフォルト系
    is_default: { true: "デフォルト", false: "通常" },
    // 必要・不要系
    pickup_required: { true: "必要", false: "不要" },
    reminder_enabled: { true: "有効", false: "無効" },
    // 表示・非表示系
    hide_from_slip: { true: "非表示", false: "表示" },
    // 公開系
    is_public: { true: "公開", false: "非公開" },
    // 完了系
    is_completed: { true: "完了", false: "未完了" },
    is_read: { true: "既読", false: "未読" },
    // 承認系
    is_approved: { true: "承認済み", false: "未承認" },
    // その他
    multiSelect: { true: "複数選択可", false: "単一選択" },
};

// ブール値の日本語表示を取得
function getBooleanLabel(columnName: string, value: boolean): string {
    const labels = BOOLEAN_LABELS[columnName];
    if (labels) {
        return value ? labels.true : labels.false;
    }
    // デフォルト
    return value ? "はい" : "いいえ";
}

// テーブルごとの優先表示カラム（先頭に表示したいカラムを順番に指定）
// 日本人にわかりやすい順: 名前・タイトル → 重要な属性 → 日時 → ID系は後ろ
const PRIORITY_COLUMNS: Record<string, string[]> = {
    // ユーザー
    users: ["display_name", "email", "is_admin", "avatar_url", "created_at"],
    // プロフィール
    profiles: ["display_name", "real_name", "role", "phone_number", "status", "approval_status", "store_id", "avatar_url"],
    // プロフィール関係
    profile_relationships: ["relationship_type", "source_profile_id", "target_profile_id", "store_id"],
    // 過去の勤務先
    past_employments: ["store_name", "period", "hourly_wage", "sales_amount", "customer_count", "profile_id"],
    // 店舗
    stores: ["name", "industry", "prefecture", "city", "business_start_time", "business_end_time"],
    // 店舗ロール
    store_roles: ["name", "permissions", "is_system_role", "store_id"],
    // 店舗投稿
    store_posts: ["title", "type", "content", "status", "visibility", "published_at", "created_by"],
    // 店舗マニュアル
    store_manuals: ["title", "content", "visibility", "status", "created_by"],
    // マニュアルタグ紐付け
    store_manual_tags: ["manual_id", "tag_id"],
    // シフト希望
    shift_requests: ["title", "description", "deadline", "status", "target_roles", "created_by"],
    // シフト希望日
    shift_request_dates: ["target_date", "default_start_time", "default_end_time", "shift_request_id"],
    // シフト提出
    shift_submissions: ["availability", "preferred_start_time", "preferred_end_time", "status", "note", "approved_start_time", "approved_end_time", "profile_id"],
    // シフト自動化設定
    shift_automation_settings: ["enabled", "target_roles", "period_type", "send_day_offset", "send_hour", "reminder_enabled", "store_id"],
    // タイムカード
    time_cards: ["work_date", "clock_in", "clock_out", "break_start", "break_end", "scheduled_start_time", "scheduled_end_time", "pickup_required", "user_id"],
    // 送迎ルート
    pickup_routes: ["date", "driver_profile_id", "round_trips", "capacity", "store_id"],
    // 送迎乗客
    pickup_passengers: ["cast_profile_id", "trip_number", "order_index", "route_id"],
    // 席
    tables: ["name", "shape", "x", "y", "width", "height", "rotation", "type_id", "store_id"],
    // 席タイプ
    table_types: ["name", "sort_order", "store_id"],
    // セッション
    table_sessions: ["start_time", "end_time", "guest_count", "total_amount", "status", "table_id", "main_guest_id", "pricing_system_id"],
    // キャスト指名
    cast_assignments: ["cast_id", "guest_id", "status", "start_time", "end_time", "grid_x", "grid_y", "table_session_id"],
    // 注文
    orders: ["item_name", "quantity", "amount", "status", "start_time", "end_time", "cast_id", "guest_id", "menu_id", "table_session_id"],
    // メニュー
    menus: ["name", "price", "category_id", "target_type", "cast_back_amount", "hide_from_slip", "image_url", "store_id"],
    // メニューカテゴリ
    menu_categories: ["name", "sort_order", "store_id"],
    // ボトルキープ
    bottle_keeps: ["menu_id", "remaining_amount", "opened_at", "expiration_date", "store_id"],
    // ボトル所有者
    bottle_keep_holders: ["profile_id", "bottle_keep_id"],
    // 料金システム
    pricing_systems: ["name", "set_fee", "set_duration_minutes", "extension_fee", "extension_duration_minutes", "nomination_fee", "companion_fee", "service_rate", "tax_rate", "is_default", "store_id"],
    // 給与システム
    salary_systems: ["name", "target_type", "hourly_settings", "store_back_settings", "shimei_back_settings", "douhan_back_settings", "deductions", "store_id"],
    // 給与設定
    profile_salary_systems: ["profile_id", "salary_system_id"],
    // 会計設定
    bill_settings: ["hourly_charge", "set_duration_minutes", "extension_fee_30m", "extension_fee_60m", "shime_fee", "jounai_fee", "tax_rate", "service_rate", "store_id"],
    // 投稿いいね
    post_likes: ["post_id", "profile_id", "created_at"],
    // 投稿既読
    post_reads: ["post_id", "profile_id", "read_at"],
    // マニュアルいいね
    manual_likes: ["manual_id", "profile_id", "created_at"],
    // マニュアル既読
    manual_reads: ["manual_id", "profile_id", "read_at"],
    // マニュアルタグ
    manual_tags: ["name", "store_id"],
    // コメント
    comments: ["content", "target_profile_id", "author_profile_id", "target_bottle_keep_id", "store_id"],
    // コメントいいね
    comment_likes: ["comment_id", "profile_id", "created_at"],
    // SNSアカウント
    sns_accounts: ["platform", "account_name", "account_id", "is_connected", "token_expires_at", "store_id"],
    // SNS予約投稿
    sns_scheduled_posts: ["content", "scheduled_at", "platforms", "instagram_type", "status", "image_url", "error_message", "created_by", "store_id"],
    // SNSテンプレート
    sns_templates: ["name", "content", "template_type", "image_style", "store_id"],
    // SNS定期投稿
    sns_recurring_schedules: ["name", "content_type", "platforms", "instagram_type", "schedule_hour", "is_active", "last_run_at", "template_id", "created_by", "store_id"],
    // CMSエントリー
    cms_entries: ["title", "type", "slug", "excerpt", "status", "published_at", "tags", "cover_image_url"],
    // AIチャット履歴
    ai_chat_messages: ["role", "content", "profile_id", "store_id", "created_at"],
};

// カラムを優先順位に従って並び替える関数
function sortColumns(columns: string[], tableName: string): string[] {
    const priority = PRIORITY_COLUMNS[tableName] || [];
    const prioritySet = new Set(priority);

    // 優先カラムを先頭に、残りはそのまま
    const priorityCols = priority.filter(col => columns.includes(col));
    const otherCols = columns.filter(col => !prioritySet.has(col));

    return [...priorityCols, ...otherCols];
}

export default function TableViewerPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const tableName = params.tableName as string;
    const idParam = searchParams.get("id");
    const supabase = createBrowserClient() as any;

    const [data, setData] = useState<any[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");

    // Edit modal state
    const [editingRecord, setEditingRecord] = useState<any | null>(null);
    const [editFormData, setEditFormData] = useState<Record<string, any>>({});
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Delete confirmation state
    const [deleteRecord, setDeleteRecord] = useState<any | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Create modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createFormData, setCreateFormData] = useState<Record<string, any>>({});
    const [isCreating, setIsCreating] = useState(false);

    // Actions menu state
    const [showActions, setShowActions] = useState(false);

    // Filter state
    const [filters, setFilters] = useState<{ column: string; value: string }[]>([]);
    const [filterColumn, setFilterColumn] = useState<string>("");
    const [filterValue, setFilterValue] = useState<string>("");
    const [showFilterUI, setShowFilterUI] = useState(false);

    // Relation data cache: { table_name: { id: { displayColumn, secondaryColumn } } }
    const [relationCache, setRelationCache] = useState<Record<string, Record<string, any>>>({});
    // Relation options for select dropdowns: { column_name: [{ id, label }] }
    const [relationOptions, setRelationOptions] = useState<Record<string, { id: string; label: string }[]>>({});

    // Related record modal state
    const [relatedRecord, setRelatedRecord] = useState<any | null>(null);
    const [relatedTableName, setRelatedTableName] = useState<string>("");
    const [relatedColumns, setRelatedColumns] = useState<string[]>([]);
    const [relatedFormData, setRelatedFormData] = useState<Record<string, any>>({});
    const [isRelatedModalOpen, setIsRelatedModalOpen] = useState(false);
    const [isLoadingRelated, setIsLoadingRelated] = useState(false);
    const [isSavingRelated, setIsSavingRelated] = useState(false);
    const [relatedRelationOptions, setRelatedRelationOptions] = useState<Record<string, { id: string; label: string }[]>>({});

    // Fetch relation data for display (no dependency on relationCache to avoid infinite loop)
    const fetchRelationData = useCallback(async (rows: any[], cols: string[]) => {
        const relatedIds: Record<string, Set<string>> = {};

        // Collect all relation IDs that need to be fetched
        cols.forEach((col) => {
            const config = RELATION_CONFIG[col];
            if (config) {
                rows.forEach((row) => {
                    const value = row[col];
                    if (value && typeof value === "string") {
                        if (!relatedIds[config.table]) {
                            relatedIds[config.table] = new Set();
                        }
                        relatedIds[config.table].add(value);
                    }
                });
            }
        });

        // Fetch data for each related table
        const fetchedData: Record<string, Record<string, any>> = {};

        for (const [tableName, ids] of Object.entries(relatedIds)) {
            const idsToFetch = Array.from(ids);
            if (idsToFetch.length === 0) continue;

            // Find what columns we need
            const columnsNeeded = new Set<string>();
            columnsNeeded.add("id");
            Object.entries(RELATION_CONFIG).forEach(([, cfg]) => {
                if (cfg.table === tableName) {
                    columnsNeeded.add(cfg.displayColumn);
                    if (cfg.secondaryColumn) columnsNeeded.add(cfg.secondaryColumn);
                }
            });

            const { data: relatedData } = await supabase
                .from(tableName)
                .select(Array.from(columnsNeeded).join(","))
                .in("id", idsToFetch);

            if (relatedData) {
                if (!fetchedData[tableName]) fetchedData[tableName] = {};
                relatedData.forEach((item: any) => {
                    fetchedData[tableName][item.id] = item;
                });
            }
        }

        // Use functional update to avoid dependency on relationCache
        setRelationCache((prev) => {
            const merged = { ...prev };
            for (const [tableName, items] of Object.entries(fetchedData)) {
                merged[tableName] = { ...merged[tableName], ...items };
            }
            return merged;
        });
    }, [supabase]);

    // Fetch all options for relation selects (used in edit modal)
    const fetchRelationOptions = useCallback(async (cols: string[]) => {
        // Use functional check to see what we already have
        setRelationOptions((currentOptions) => {
            const colsToFetch = cols.filter((col) => RELATION_CONFIG[col] && !currentOptions[col]);
            if (colsToFetch.length === 0) return currentOptions;

            // Fetch in background and update later
            (async () => {
                const newOptions: Record<string, { id: string; label: string }[]> = {};

                for (const col of colsToFetch) {
                    const config = RELATION_CONFIG[col];
                    if (!config) continue;

                    const columnsToFetch = ["id", config.displayColumn];
                    if (config.secondaryColumn) columnsToFetch.push(config.secondaryColumn);

                    const { data } = await supabase
                        .from(config.table)
                        .select(columnsToFetch.join(","))
                        .order(config.displayColumn, { ascending: true })
                        .limit(500);

                    if (data) {
                        newOptions[col] = data.map((item: any) => {
                            let label = item[config.displayColumn] || item.id;
                            if (config.secondaryColumn && item[config.secondaryColumn]) {
                                const secondary = item[config.secondaryColumn];
                                if (typeof secondary === "number") {
                                    label += ` (¥${secondary.toLocaleString()})`;
                                } else {
                                    label += ` (${secondary})`;
                                }
                            }
                            return { id: item.id, label };
                        });
                    }
                }

                if (Object.keys(newOptions).length > 0) {
                    setRelationOptions((prev) => ({ ...prev, ...newOptions }));
                }
            })();

            return currentOptions;
        });
    }, [supabase]);

    // Get display value for a relation ID
    const getRelationDisplay = (columnName: string, value: string): string | null => {
        const config = RELATION_CONFIG[columnName];
        if (!config || !value) return null;

        const cached = relationCache[config.table]?.[value];
        if (!cached) return null;

        let display = cached[config.displayColumn] || value;
        if (config.secondaryColumn && cached[config.secondaryColumn]) {
            const secondary = cached[config.secondaryColumn];
            if (typeof secondary === "number") {
                display += ` (¥${secondary.toLocaleString()})`;
            } else {
                display += ` (${secondary})`;
            }
        }
        return display;
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // If idParam is present, fetch that specific record directly
            if (idParam) {
                const { data: rows, error: dataError } = await supabase
                    .from(tableName)
                    .select("*")
                    .eq("id", idParam);

                if (dataError) throw dataError;

                if (rows && rows.length > 0) {
                    const cols = Object.keys(rows[0]);
                    const sortedCols = sortColumns(cols, tableName);
                    setColumns(sortedCols);
                    setData(rows);
                    setTotalCount(rows.length);
                } else {
                    setData([]);
                    setColumns([]);
                    setTotalCount(0);
                }
                setLoading(false);
                return;
            }

            // Get count first
            const { count, error: countError } = await supabase
                .from(tableName)
                .select("*", { count: "exact", head: true });

            if (countError) throw countError;
            setTotalCount(count || 0);

            // Fetch data with pagination
            const { data: rows, error: dataError } = await supabase
                .from(tableName)
                .select("*")
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
                .order("created_at", { ascending: false, nullsFirst: false });

            if (dataError) throw dataError;

            if (rows && rows.length > 0) {
                const cols = Object.keys(rows[0]);
                const sortedCols = sortColumns(cols, tableName);
                setColumns(sortedCols);
                setData(rows);
            } else {
                // Try to get columns from an empty table by selecting with limit 0
                // This won't work, so we'll just show an empty state
                setData([]);
                setColumns([]);
            }
        } catch (err: any) {
            setError(err.message || "データの取得に失敗しました");
            setData([]);
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tableName, page, supabase, idParam]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Fetch relation data when data changes
    useEffect(() => {
        if (data.length > 0 && columns.length > 0) {
            fetchRelationData(data, columns);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, columns]);

    // Fetch relation options when columns change (for edit modal selects)
    useEffect(() => {
        if (columns.length > 0) {
            fetchRelationOptions(columns);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [columns]);

    // Auto-filter by id when navigating from relation link
    useEffect(() => {
        if (idParam) {
            setFilters([{ column: "id", value: idParam }]);
        }
    }, [idParam]);

    const handleEdit = (record: any) => {
        setEditingRecord(record);
        setEditFormData({ ...record });
        setIsEditModalOpen(true);
    };

    // Fetch relation options for related modal
    const fetchRelatedRelationOptions = async (cols: string[]) => {
        const newOptions: Record<string, { id: string; label: string }[]> = {};

        for (const col of cols) {
            const config = RELATION_CONFIG[col];
            if (!config) continue;

            const columnsToFetch = ["id", config.displayColumn];
            if (config.secondaryColumn) columnsToFetch.push(config.secondaryColumn);

            const { data } = await supabase
                .from(config.table)
                .select(columnsToFetch.join(","))
                .order(config.displayColumn, { ascending: true })
                .limit(500);

            if (data) {
                newOptions[col] = data.map((item: any) => {
                    let label = item[config.displayColumn] || item.id;
                    if (config.secondaryColumn && item[config.secondaryColumn]) {
                        const secondary = item[config.secondaryColumn];
                        if (typeof secondary === "number") {
                            label += ` (¥${secondary.toLocaleString()})`;
                        } else {
                            label += ` (${secondary})`;
                        }
                    }
                    return { id: item.id, label };
                });
            }
        }

        setRelatedRelationOptions(newOptions);
    };

    // Open related record in modal
    const openRelatedRecord = async (relTableName: string, recordId: string) => {
        setIsLoadingRelated(true);
        setRelatedTableName(relTableName);
        setIsRelatedModalOpen(true);

        try {
            const { data: record, error } = await supabase
                .from(relTableName)
                .select("*")
                .eq("id", recordId)
                .single();

            if (error) throw error;

            if (record) {
                const cols = Object.keys(record);
                const sortedCols = sortColumns(cols, relTableName);
                setRelatedColumns(sortedCols);
                setRelatedRecord(record);
                setRelatedFormData({ ...record });
                // Fetch relation options for this table's columns
                fetchRelatedRelationOptions(sortedCols);
            }
        } catch (err: any) {
            console.error("Failed to fetch related record:", err);
            setRelatedRecord(null);
        } finally {
            setIsLoadingRelated(false);
        }
    };

    // Save related record
    const handleSaveRelated = async () => {
        if (!relatedRecord || !relatedTableName) return;

        setIsSavingRelated(true);
        try {
            const { error } = await supabase
                .from(relatedTableName)
                .update(relatedFormData)
                .eq("id", relatedRecord.id);

            if (error) throw error;

            setIsRelatedModalOpen(false);
            // Refresh main data to reflect changes
            fetchData();
        } catch (err: any) {
            toast({ title: `保存に失敗しました: ${err.message}`, variant: "destructive" });
        } finally {
            setIsSavingRelated(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingRecord) return;

        setIsSaving(true);
        try {
            const { error } = await (supabase as any)
                .from(tableName)
                .update(editFormData)
                .eq("id", editingRecord.id);

            if (error) throw error;

            setIsEditModalOpen(false);
            fetchData();
        } catch (err: any) {
            toast({ title: `保存に失敗しました: ${err.message}`, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        if (!editingRecord) return;
        setShowActions(false);
        setIsEditModalOpen(false);
        setDeleteRecord(editingRecord);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteRecord) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from(tableName)
                .delete()
                .eq("id", deleteRecord.id);

            if (error) throw error;

            setIsDeleteModalOpen(false);
            fetchData();
        } catch (err: any) {
            toast({ title: `削除に失敗しました: ${err.message}`, variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCreate = () => {
        setCreateFormData({});
        setIsCreateModalOpen(true);
    };

    const handleSaveCreate = async () => {
        setIsCreating(true);
        try {
            const { error } = await (supabase as any)
                .from(tableName)
                .insert(createFormData);

            if (error) throw error;

            setIsCreateModalOpen(false);
            fetchData();
        } catch (err: any) {
            toast({ title: `作成に失敗しました: ${err.message}`, variant: "destructive" });
        } finally {
            setIsCreating(false);
        }
    };

    // Filter functions
    const addFilter = () => {
        if (!filterColumn || !filterValue.trim()) return;
        setFilters((prev) => [...prev, { column: filterColumn, value: filterValue.trim() }]);
        setFilterColumn("");
        setFilterValue("");
    };

    const removeFilter = (index: number) => {
        setFilters((prev) => prev.filter((_, i) => i !== index));
    };

    const clearAllFilters = () => {
        setFilters([]);
    };

    // Apply filters to data
    const filteredData = data.filter((row) => {
        return filters.every((filter) => {
            const cellValue = row[filter.column];
            if (cellValue === null || cellValue === undefined) {
                return filter.value.toLowerCase() === "null" || filter.value === "-";
            }
            const stringValue = typeof cellValue === "object"
                ? JSON.stringify(cellValue)
                : String(cellValue);
            return stringValue.toLowerCase().includes(filter.value.toLowerCase());
        });
    });

    const formatCellValue = (columnName: string, value: any): string => {
        if (value === null || value === undefined) return "-";

        // ブール値は日本語で表示
        if (typeof value === "boolean") {
            return getBooleanLabel(columnName, value);
        }

        // オブジェクトはJSON表示
        if (typeof value === "object") return JSON.stringify(value);

        if (typeof value === "string") {
            // リレーションIDの場合は関連データを表示
            if (RELATION_CONFIG[columnName]) {
                const display = getRelationDisplay(columnName, value);
                if (display) return display;
                // キャッシュにない場合はIDを短縮表示
                if (value.length > 8) {
                    return value.substring(0, 8) + "...";
                }
            }

            // UUID形式（リレーション設定がないID）は短縮表示
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
                return value.substring(0, 8) + "...";
            }

            // ISO 8601形式の日時を検出して日本時間でフォーマット
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleString("ja-JP", {
                        timeZone: "Asia/Tokyo",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                    });
                }
            }
            // 日付のみ（YYYY-MM-DD形式）
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                return value.replace(/-/g, "/");
            }
            // 長い文字列は省略
            if (value.length > 50) {
                return value.substring(0, 50) + "...";
            }
        }
        return String(value);
    };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const exportToCsv = () => {
        if (data.length === 0) return;

        const csvContent = [
            columns.join(","),
            ...data.map((row) =>
                columns.map((col) => {
                    const val = row[col];
                    if (val === null || val === undefined) return "";
                    if (typeof val === "string" && (val.includes(",") || val.includes('"'))) {
                        return `"${val.replace(/"/g, '""')}"`;
                    }
                    return String(val);
                }).join(",")
            ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${tableName}.csv`;
        link.click();
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin"
                        className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors shrink-0"
                    >
                        <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                            {TABLE_LABELS[tableName] || tableName}
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {filters.length > 0 ? `${filteredData.length} / ${totalCount} レコード` : `${totalCount} レコード`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 ml-auto sm:ml-0">
                    <Button
                        variant={showFilterUI || filters.length > 0 ? "default" : "outline"}
                        size="icon"
                        className={`h-8 w-8 shrink-0 ${showFilterUI || filters.length > 0 ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                        onClick={() => setShowFilterUI(!showFilterUI)}
                    >
                        <Filter className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={fetchData}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={exportToCsv}
                        disabled={data.length === 0}
                    >
                        <Download className="h-5 w-5" />
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleCreate}
                        className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                    >
                        <Plus className="h-5 w-5 sm:mr-1" />
                        <span className="hidden sm:inline">新規作成</span>
                    </Button>
                </div>
            </div>

            {/* Filter UI */}
            {showFilterUI && (
                <div className="p-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <select
                            value={filterColumn}
                            onChange={(e) => setFilterColumn(e.target.value)}
                            className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white flex-1 sm:flex-none sm:w-48"
                        >
                            <option value="">カラムを選択</option>
                            {columns.map((col) => (
                                <option key={col} value={col}>
                                    {COLUMN_LABELS[col] || col}
                                </option>
                            ))}
                        </select>
                        <Input
                            placeholder="フィルター値を入力..."
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addFilter()}
                            className="h-9 flex-1"
                        />
                        <Button
                            size="sm"
                            onClick={addFilter}
                            disabled={!filterColumn || !filterValue.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white h-9"
                        >
                            追加
                        </Button>
                    </div>

                    {/* Active filters */}
                    {filters.length > 0 && (
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-xs text-gray-500 dark:text-gray-400">フィルター:</span>
                            {filters.map((filter, index) => (
                                <div
                                    key={index}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs"
                                >
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{COLUMN_LABELS[filter.column] || filter.column}</span>
                                    <span>=</span>
                                    <span>"{filter.value}"</span>
                                    <button
                                        onClick={() => removeFilter(index)}
                                        className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={clearAllFilters}
                                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                            >
                                すべてクリア
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Active filters summary (when filter UI is hidden) */}
            {!showFilterUI && filters.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">フィルター中:</span>
                    {filters.map((filter, index) => (
                        <div
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs"
                        >
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{COLUMN_LABELS[filter.column] || filter.column}</span>
                            <span>=</span>
                            <span>"{filter.value}"</span>
                            <button
                                onClick={() => removeFilter(index)}
                                className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* Table */}
            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                                {columns.map((col) => (
                                    <TableHead
                                        key={col}
                                        className="px-4 py-3 text-center text-gray-900 dark:text-gray-100 text-xs whitespace-nowrap"
                                    >
                                        {COLUMN_LABELS[col] || col}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="text-center py-8 text-gray-500"
                                    >
                                        読み込み中...
                                    </TableCell>
                                </TableRow>
                            ) : filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="text-center py-8 text-gray-500"
                                    >
                                        {filters.length > 0 ? "フィルターに一致するデータがありません" : "データがありません"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((row, idx) => (
                                    <TableRow
                                        key={row.id || idx}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                                        onClick={() => handleEdit(row)}
                                    >
                                        {columns.map((col) => {
                                            const relationConfig = RELATION_CONFIG[col];
                                            const hasRelation = relationConfig && row[col];

                                            return (
                                            <TableCell
                                                key={col}
                                                className="px-4 py-3 text-center text-xs text-gray-700 dark:text-gray-300 max-w-[200px]"
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className="truncate">{formatCellValue(col, row[col])}</span>
                                                    {hasRelation && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openRelatedRecord(relationConfig.table, row[col]);
                                                            }}
                                                            className="flex-shrink-0 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                                            title={`${TABLE_LABELS[relationConfig.table] || relationConfig.table}を開く`}
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, totalCount)} / {totalCount}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {page + 1} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={(open) => {
                setIsEditModalOpen(open);
                if (!open) setShowActions(false);
            }}>
                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-800 p-6">
                    <DialogHeader className="flex flex-row items-center justify-between gap-2 relative">
                        <button
                            type="button"
                            onClick={() => setIsEditModalOpen(false)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-bold text-gray-900 dark:text-white truncate">
                            {TABLE_LABELS[tableName] || tableName}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {TABLE_LABELS[tableName] || tableName} テーブルのレコードを編集します
                        </DialogDescription>
                        <button
                            type="button"
                            onClick={() => setShowActions(!showActions)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                            aria-label="オプション"
                        >
                            <MoreHorizontal className="h-5 w-5" />
                        </button>

                        {showActions && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                                <div className="absolute right-0 top-10 z-50 w-40 rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-2 flex flex-col gap-1 text-sm animate-in fade-in zoom-in-95 duration-200">
                                    <button
                                        type="button"
                                        className="w-full text-left px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        onClick={handleDelete}
                                    >
                                        削除
                                    </button>
                                </div>
                            </>
                        )}
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {columns.map((col) => {
                            const originalValue = editingRecord?.[col];
                            const isDateTime = isDateTimeColumn(col, originalValue);
                            const isDate = isDateColumn(col, originalValue);
                            const hasRelation = RELATION_CONFIG[col] && relationOptions[col];
                            const boolLabels = BOOLEAN_LABELS[col] || { true: "はい", false: "いいえ" };

                            return (
                            <div key={col} className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {COLUMN_LABELS[col] || col}
                                    {isDateTime && <span className="ml-2 text-xs text-gray-400">(JST)</span>}
                                    {hasRelation && <span className="ml-2 text-xs text-blue-500">→ {RELATION_CONFIG[col].table}</span>}
                                </label>
                                {typeof editFormData[col] === "boolean" ? (
                                    <select
                                        value={editFormData[col] ? "true" : "false"}
                                        onChange={(e) =>
                                            setEditFormData((prev) => ({
                                                ...prev,
                                                [col]: e.target.value === "true",
                                            }))
                                        }
                                        className="w-full h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                                    >
                                        <option value="true">{boolLabels.true}</option>
                                        <option value="false">{boolLabels.false}</option>
                                    </select>
                                ) : typeof editFormData[col] === "object" && editFormData[col] !== null ? (
                                    <textarea
                                        value={JSON.stringify(editFormData[col], null, 2)}
                                        onChange={(e) => {
                                            try {
                                                const parsed = JSON.parse(e.target.value);
                                                setEditFormData((prev) => ({
                                                    ...prev,
                                                    [col]: parsed,
                                                }));
                                            } catch {
                                                // Invalid JSON, keep as string
                                            }
                                        }}
                                        className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-mono text-gray-900 dark:text-white"
                                        rows={4}
                                    />
                                ) : hasRelation ? (
                                    <div className="flex gap-2">
                                        <select
                                            value={editFormData[col] ?? ""}
                                            onChange={(e) =>
                                                setEditFormData((prev) => ({
                                                    ...prev,
                                                    [col]: e.target.value || null,
                                                }))
                                            }
                                            className="flex-1 h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                                        >
                                            <option value="">-- 選択してください --</option>
                                            {relationOptions[col]?.map((opt) => (
                                                <option key={opt.id} value={opt.id}>
                                                    {opt.label}
                                            </option>
                                        ))}
                                        </select>
                                        {editFormData[col] && (
                                            <button
                                                type="button"
                                                onClick={() => openRelatedRecord(RELATION_CONFIG[col].table, editFormData[col])}
                                                className="flex-shrink-0 h-9 px-3 inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                title={`${TABLE_LABELS[RELATION_CONFIG[col].table] || RELATION_CONFIG[col].table}を開く`}
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ) : isDateTime ? (
                                    <input
                                        type="datetime-local"
                                        value={utcToLocalDatetime(editFormData[col])}
                                        onChange={(e) =>
                                            setEditFormData((prev) => ({
                                                ...prev,
                                                [col]: localDatetimeToUtc(e.target.value),
                                            }))
                                        }
                                        className="w-full h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                                    />
                                ) : isDate ? (
                                    <input
                                        type="date"
                                        value={editFormData[col] ?? ""}
                                        onChange={(e) =>
                                            setEditFormData((prev) => ({
                                                ...prev,
                                                [col]: e.target.value || null,
                                            }))
                                        }
                                        className="w-full h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                                    />
                                ) : (
                                    <Input
                                        value={editFormData[col] ?? ""}
                                        onChange={(e) =>
                                            setEditFormData((prev) => ({
                                                ...prev,
                                                [col]: e.target.value || null,
                                            }))
                                        }
                                        className="font-mono text-sm"
                                    />
                                )}
                            </div>
                            );
                        })}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsEditModalOpen(false)}
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            disabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isSaving ? "保存中..." : "保存"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">
                            削除の確認
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                            このレコードを削除してもよろしいですか？この操作は取り消せません。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteModalOpen(false)}
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? "削除中..." : "削除"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-800 p-6">
                    <DialogHeader className="flex flex-row items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-bold text-gray-900 dark:text-white truncate">
                            新規作成
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {TABLE_LABELS[tableName] || tableName} テーブルに新しいレコードを追加します
                        </DialogDescription>
                        <div className="w-8 h-8" />
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {columns.filter(col => col !== "id" && col !== "created_at" && col !== "updated_at").map((col) => {
                            const isDateTime = DATETIME_COLUMNS.includes(col);
                            const isDate = DATE_COLUMNS.includes(col);
                            const hasRelation = RELATION_CONFIG[col] && relationOptions[col];

                            return (
                            <div key={col} className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {COLUMN_LABELS[col] || col}
                                    {isDateTime && <span className="ml-2 text-xs text-gray-400">(JST)</span>}
                                    {hasRelation && <span className="ml-2 text-xs text-blue-500">→ {RELATION_CONFIG[col].table}</span>}
                                </label>
                                {hasRelation ? (
                                    <div className="flex gap-2">
                                        <select
                                            value={createFormData[col] ?? ""}
                                            onChange={(e) =>
                                                setCreateFormData((prev) => ({
                                                    ...prev,
                                                    [col]: e.target.value || null,
                                                }))
                                            }
                                            className="flex-1 h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                                        >
                                            <option value="">-- 選択してください --</option>
                                            {relationOptions[col]?.map((opt) => (
                                                <option key={opt.id} value={opt.id}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                        {createFormData[col] && (
                                            <button
                                                type="button"
                                                onClick={() => openRelatedRecord(RELATION_CONFIG[col].table, createFormData[col])}
                                                className="flex-shrink-0 h-9 px-3 inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                title={`${TABLE_LABELS[RELATION_CONFIG[col].table] || RELATION_CONFIG[col].table}を開く`}
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ) : isDateTime ? (
                                    <input
                                        type="datetime-local"
                                        value={utcToLocalDatetime(createFormData[col])}
                                        onChange={(e) =>
                                            setCreateFormData((prev) => ({
                                                ...prev,
                                                [col]: localDatetimeToUtc(e.target.value),
                                            }))
                                        }
                                        className="w-full h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                                    />
                                ) : isDate ? (
                                    <input
                                        type="date"
                                        value={createFormData[col] ?? ""}
                                        onChange={(e) =>
                                            setCreateFormData((prev) => ({
                                                ...prev,
                                                [col]: e.target.value || null,
                                            }))
                                        }
                                        className="w-full h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                                    />
                                ) : (
                                    <Input
                                        value={createFormData[col] ?? ""}
                                        onChange={(e) =>
                                            setCreateFormData((prev) => ({
                                                ...prev,
                                                [col]: e.target.value || null,
                                            }))
                                        }
                                        className="font-mono text-sm"
                                    />
                                )}
                            </div>
                            );
                        })}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateModalOpen(false)}
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleSaveCreate}
                            disabled={isCreating}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isCreating ? "作成中..." : "作成"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Related Record Modal (Editable) */}
            <Dialog open={isRelatedModalOpen} onOpenChange={setIsRelatedModalOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-800 p-6">
                    <DialogHeader className="flex flex-row items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => setIsRelatedModalOpen(false)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none"
                            aria-label="閉じる"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-bold text-gray-900 dark:text-white truncate">
                            {TABLE_LABELS[relatedTableName] || relatedTableName}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {TABLE_LABELS[relatedTableName] || relatedTableName} の関連レコードを編集します
                        </DialogDescription>
                        <div className="w-8 h-8" />
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {isLoadingRelated ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="text-gray-500">読み込み中...</div>
                            </div>
                        ) : !relatedRecord ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="text-gray-500">レコードが見つかりませんでした</div>
                            </div>
                        ) : (
                            relatedColumns.map((col) => {
                                const originalValue = relatedRecord[col];
                                const isDateTime = isDateTimeColumn(col, originalValue);
                                const isDate = isDateColumn(col, originalValue);
                                const hasRelation = RELATION_CONFIG[col] && relatedRelationOptions[col];
                                const boolLabels = BOOLEAN_LABELS[col] || { true: "はい", false: "いいえ" };

                                return (
                                    <div key={col} className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                            {COLUMN_LABELS[col] || col}
                                            {isDateTime && <span className="ml-2 text-xs text-gray-400">(JST)</span>}
                                            {hasRelation && <span className="ml-2 text-xs text-blue-500">→ {RELATION_CONFIG[col].table}</span>}
                                        </label>
                                        {typeof relatedFormData[col] === "boolean" ? (
                                            <select
                                                value={relatedFormData[col] ? "true" : "false"}
                                                onChange={(e) =>
                                                    setRelatedFormData((prev) => ({
                                                        ...prev,
                                                        [col]: e.target.value === "true",
                                                    }))
                                                }
                                                className="w-full h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                                            >
                                                <option value="true">{boolLabels.true}</option>
                                                <option value="false">{boolLabels.false}</option>
                                            </select>
                                        ) : typeof relatedFormData[col] === "object" && relatedFormData[col] !== null ? (
                                            <textarea
                                                value={JSON.stringify(relatedFormData[col], null, 2)}
                                                onChange={(e) => {
                                                    try {
                                                        const parsed = JSON.parse(e.target.value);
                                                        setRelatedFormData((prev) => ({
                                                            ...prev,
                                                            [col]: parsed,
                                                        }));
                                                    } catch {
                                                        // Invalid JSON, keep as string
                                                    }
                                                }}
                                                className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-mono text-gray-900 dark:text-white"
                                                rows={4}
                                            />
                                        ) : hasRelation ? (
                                            <div className="flex gap-2">
                                                <select
                                                    value={relatedFormData[col] ?? ""}
                                                    onChange={(e) =>
                                                        setRelatedFormData((prev) => ({
                                                            ...prev,
                                                            [col]: e.target.value || null,
                                                        }))
                                                    }
                                                    className="flex-1 h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                                                >
                                                    <option value="">-- 選択してください --</option>
                                                    {relatedRelationOptions[col]?.map((opt) => (
                                                        <option key={opt.id} value={opt.id}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                {relatedFormData[col] && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openRelatedRecord(RELATION_CONFIG[col].table, relatedFormData[col])}
                                                        className="flex-shrink-0 h-9 px-3 inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                        title={`${TABLE_LABELS[RELATION_CONFIG[col].table] || RELATION_CONFIG[col].table}を開く`}
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ) : isDateTime ? (
                                            <input
                                                type="datetime-local"
                                                value={utcToLocalDatetime(relatedFormData[col])}
                                                onChange={(e) =>
                                                    setRelatedFormData((prev) => ({
                                                        ...prev,
                                                        [col]: localDatetimeToUtc(e.target.value),
                                                    }))
                                                }
                                                className="w-full h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                                            />
                                        ) : isDate ? (
                                            <input
                                                type="date"
                                                value={relatedFormData[col] ?? ""}
                                                onChange={(e) =>
                                                    setRelatedFormData((prev) => ({
                                                        ...prev,
                                                        [col]: e.target.value || null,
                                                    }))
                                                }
                                                className="w-full h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                                            />
                                        ) : (
                                            <Input
                                                value={relatedFormData[col] ?? ""}
                                                onChange={(e) =>
                                                    setRelatedFormData((prev) => ({
                                                        ...prev,
                                                        [col]: e.target.value || null,
                                                    }))
                                                }
                                                className="font-mono text-sm"
                                            />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsRelatedModalOpen(false)}
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleSaveRelated}
                            disabled={isSavingRelated || isLoadingRelated}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isSavingRelated ? "保存中..." : "保存"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
