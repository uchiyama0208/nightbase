"use server";

import { getAuthContextForPage } from "@/lib/auth-helpers";
import { createServiceRoleClient } from "@/lib/supabaseServiceClient";
import { getJSTDateString } from "@/lib/utils";
import type { Store } from "@/types/common";
import type {
    DashboardDataResult,
    DashboardProfile,
    RankingItem,
    SalaryBackSettings,
} from "./types";
import { getBusinessDate } from "../queue/utils";

// 型の再エクスポート
export type { DashboardDataResult } from "./types";

// ============================================
// ユーティリティ関数
// ============================================

/**
 * バック金額を計算
 */
function calculateBackAmount(
    backSettings: SalaryBackSettings | null | undefined,
    itemPrice: number,
    quantity: number,
    defaultCastBack: number
): number {
    if (!backSettings) {
        return defaultCastBack * quantity;
    }
    const calculationType = backSettings.calculation_type;
    if (calculationType === "fixed") {
        return (backSettings.fixed_amount || 0) * quantity;
    } else if (calculationType === "total_percent" || calculationType === "subtotal_percent") {
        const percentage = backSettings.percentage || 0;
        return Math.floor(itemPrice * quantity * (percentage / 100));
    }
    return defaultCastBack * quantity;
}

// ============================================
// ダッシュボードデータ取得
// ============================================

/**
 * ダッシュボードページ用のデータを取得
 */
export async function getDashboardData(): Promise<DashboardDataResult> {
    const result = await getAuthContextForPage();

    if ("redirect" in result) {
        return { redirect: result.redirect };
    }

    const { context } = result;
    const { supabase, storeId, profileId } = context;

    // 現在のプロフィールを取得
    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("*, stores(*)")
        .eq("id", profileId)
        .maybeSingle();

    if (!currentProfile || !currentProfile.store_id) {
        return { redirect: "/app/me" };
    }

    const store = currentProfile.stores as Store | null;
    if (store?.show_dashboard === false) {
        return { redirect: "/app/timecard" };
    }

    const storeName = store?.name ?? null;
    const today = getJSTDateString();
    // 営業日（送迎管理用）- day_switch_timeを考慮
    const daySwitchTime = store?.day_switch_time || "05:00";
    const businessDate = getBusinessDate(daySwitchTime);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceSupabase = createServiceRoleClient() as any;

    // 営業日に対応するwork_dateを計算（営業日と翌日）
    const businessDateObj = new Date(businessDate + "T00:00:00+09:00");
    const nextDateObj = new Date(businessDateObj);
    nextDateObj.setDate(nextDateObj.getDate() + 1);
    const nextDate = nextDateObj.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");

    // day_switch_timeをパース
    const switchParts = daySwitchTime.split(":");
    const switchHour = parseInt(switchParts[0], 10) || 5;
    const switchMinute = parseInt(switchParts[1], 10) || 0;

    // ========== STAGE 1: プロフィール取得（フィルタリングに必要） ==========
    const [profilesResult, joinRequestsCountResult] = await Promise.all([
        serviceSupabase
            .from("profiles")
            .select("id, role, invite_status, display_name")
            .eq("store_id", storeId),
        serviceSupabase
            .from("join_requests")
            .select("id", { count: "exact", head: true })
            .eq("store_id", storeId)
            .eq("status", "pending"),
    ]);

    const allProfiles = profilesResult.data;
    const storeProfileIds = allProfiles?.map((p: DashboardProfile) => p.id) || [];
    const castProfileIds = allProfiles?.filter((p: DashboardProfile) => p.role === "cast").map((p: DashboardProfile) => p.id) || [];
    const staffProfileIds = allProfiles?.filter((p: DashboardProfile) => ["staff", "admin"].includes(p.role)).map((p: DashboardProfile) => p.id) || [];

    // ユーザータブのカウント
    const castCount = allProfiles?.filter((p: DashboardProfile) => p.role === "cast").length || 0;
    const staffCount = allProfiles?.filter((p: DashboardProfile) => ["staff", "admin"].includes(p.role)).length || 0;
    const guestCount = allProfiles?.filter((p: DashboardProfile) => p.role === "guest").length || 0;
    const partnerCount = allProfiles?.filter((p: DashboardProfile) => p.role === "partner").length || 0;
    const pendingJoinRequestsCount = joinRequestsCountResult.count || 0;

    // ========== STAGE 2: 独立したクエリを並列実行 ==========
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
        // シフトタブ
        activeTimeCardsResult,
        currentUserTimeCardResult,
        lastClockInResult,
        todayShiftsResult,
        nextShiftResult,
        openShiftRequestsResult,
        pickupRequestsResult,
        todayRoutesResult,
        // ユーザータブ
        rolesCountResult,
        // フロアタブ
        tablesCountResult,
        activeSessionsResult,
        unpaidSlipsCountResult,
        menusCountResult,
        activeBottleKeepsCountResult,
        // 給与タブ
        pricingSystemsCountResult,
        salarySystemsCountResult,
        todaySalesResult,
        menusForPayrollResult,
        todayTimeCardsForPayrollResult,
        // コミュニティタブ
        postsCountResult,
        manualsCountResult,
        todaySnsPostsCountResult,
        scheduledSnsPostsCountResult,
        // 未読カウント
        allPublishedPostsResult,
        allPublishedManualsResult,
        userReadPostsResult,
        userReadManualsResult,
        // ユーザータブ - 履歴書
        pendingResumesCountResult,
        // フロアタブ - 順番待ち
        waitingQueueCountResult,
        // フロアタブ - 予約
        todayReservationsCountResult,
        // フロアタブ - 在庫
        lowStockCountResult,
        // コミュニティタブ - AIクレジット
        aiCreditsResult,
        // ユーザータブ - 招待中カウント
        pendingInvitationsResult,
    ] = await Promise.all([
        // シフトタブのクエリ
        serviceSupabase
            .from("time_cards")
            .select("user_id")
            .eq("work_date", today)
            .is("clock_out", null)
            .in("user_id", storeProfileIds.length > 0 ? storeProfileIds : ["none"]),
        serviceSupabase
            .from("time_cards")
            .select("clock_in")
            .eq("user_id", profileId)
            .eq("work_date", today)
            .is("clock_out", null)
            .maybeSingle(),
        serviceSupabase
            .from("time_cards")
            .select("work_date, clock_in, clock_out")
            .eq("user_id", profileId)
            .not("clock_out", "is", null)
            .order("work_date", { ascending: false })
            .order("clock_in", { ascending: false })
            .limit(1)
            .maybeSingle(),
        serviceSupabase
            .from("shift_submissions")
            .select(`profile_id, status, shift_request_dates!inner(target_date, shift_requests!inner(store_id))`)
            .eq("status", "approved")
            .eq("shift_request_dates.target_date", today)
            .eq("shift_request_dates.shift_requests.store_id", storeId),
        serviceSupabase
            .from("shift_submissions")
            .select(`shift_request_dates!inner(target_date, shift_requests!inner(store_id))`)
            .eq("profile_id", profileId)
            .eq("status", "approved")
            .eq("shift_request_dates.shift_requests.store_id", storeId)
            .gt("shift_request_dates.target_date", today)
            .order("shift_request_dates(target_date)", { ascending: true })
            .limit(1)
            .maybeSingle(),
        serviceSupabase
            .from("shift_requests")
            .select("id, target_roles, target_profile_ids")
            .eq("store_id", storeId)
            .eq("status", "open")
            .gt("deadline", new Date().toISOString()),
        serviceSupabase
            .from("time_cards")
            .select("user_id, clock_in, pickup_destination")
            .in("work_date", [businessDate, nextDate])
            .not("pickup_destination", "is", null)
            .in("user_id", storeProfileIds.length > 0 ? storeProfileIds : ["none"]),
        serviceSupabase
            .from("pickup_routes")
            .select("id")
            .eq("store_id", storeId)
            .eq("date", businessDate),
        // ユーザータブのクエリ
        serviceSupabase
            .from("store_roles")
            .select("id", { count: "exact", head: true })
            .eq("store_id", storeId),
        // フロアタブのクエリ
        serviceSupabase
            .from("tables")
            .select("id", { count: "exact", head: true })
            .eq("store_id", storeId),
        serviceSupabase
            .from("table_sessions")
            .select("id, guest_count")
            .eq("store_id", storeId)
            .eq("status", "active"),
        serviceSupabase
            .from("table_sessions")
            .select("id", { count: "exact", head: true })
            .eq("store_id", storeId)
            .neq("status", "closed"),
        serviceSupabase
            .from("menus")
            .select("id", { count: "exact", head: true })
            .eq("store_id", storeId),
        serviceSupabase
            .from("bottle_keeps")
            .select("id", { count: "exact", head: true })
            .eq("store_id", storeId)
            .gt("remaining_amount", 0),
        // 給与タブのクエリ
        serviceSupabase
            .from("pricing_systems")
            .select("id", { count: "exact", head: true })
            .eq("store_id", storeId),
        serviceSupabase
            .from("salary_systems")
            .select("id", { count: "exact", head: true })
            .eq("store_id", storeId),
        // 本日の売上クエリ
        serviceSupabase
            .from("table_sessions")
            .select("id, total_amount")
            .eq("store_id", storeId)
            .gte("start_time", todayStart.toISOString())
            .lte("start_time", todayEnd.toISOString()),
        // 給与計算用メニュー
        serviceSupabase
            .from("menus")
            .select("id, cast_back_amount")
            .eq("store_id", storeId),
        // 給与計算用タイムカード
        serviceSupabase
            .from("time_cards")
            .select(`
                id, user_id, clock_in, clock_out,
                profiles!inner(
                    id,
                    profile_salary_systems(
                        salary_systems(hourly_settings, store_back_settings, shimei_back_settings, jounai_back_settings, douhan_back_settings)
                    )
                )
            `)
            .eq("work_date", today)
            .in("user_id", storeProfileIds.length > 0 ? storeProfileIds : ["none"]),
        // コミュニティタブのクエリ
        serviceSupabase
            .from("store_posts")
            .select("id", { count: "exact", head: true })
            .eq("store_id", storeId)
            .eq("status", "published"),
        serviceSupabase
            .from("store_manuals")
            .select("id", { count: "exact", head: true })
            .eq("store_id", storeId)
            .eq("status", "published"),
        serviceSupabase
            .from("sns_scheduled_posts")
            .select("id", { count: "exact", head: true })
            .eq("store_id", storeId)
            .eq("status", "posted")
            .gte("scheduled_at", todayStart.toISOString())
            .lte("scheduled_at", todayEnd.toISOString()),
        serviceSupabase
            .from("sns_scheduled_posts")
            .select("id", { count: "exact", head: true })
            .eq("store_id", storeId)
            .eq("status", "scheduled")
            .gt("scheduled_at", new Date().toISOString()),
        // 未読投稿クエリ
        serviceSupabase
            .from("store_posts")
            .select("id")
            .eq("store_id", storeId)
            .eq("status", "published")
            .eq("type", "board"),
        // 未読マニュアルクエリ
        serviceSupabase
            .from("store_manuals")
            .select("id")
            .eq("store_id", storeId)
            .eq("status", "published"),
        // ユーザーの既読投稿
        serviceSupabase
            .from("post_reads")
            .select("post_id")
            .eq("profile_id", profileId),
        // ユーザーの既読マニュアル
        serviceSupabase
            .from("manual_reads")
            .select("manual_id")
            .eq("profile_id", profileId),
        // 保留中の履歴書カウント
        serviceSupabase
            .from("resume_submissions")
            .select("id", { count: "exact", head: true })
            .eq("store_id", storeId)
            .eq("status", "submitted")
            .is("profile_id", null),
        // 待機中の順番待ちカウント
        serviceSupabase
            .from("queue_entries")
            .select("id", { count: "exact", head: true })
            .eq("store_id", storeId)
            .eq("status", "waiting"),
        // 本日の予約カウント
        serviceSupabase
            .from("reservations")
            .select("id", { count: "exact", head: true })
            .eq("store_id", storeId)
            .eq("reservation_date", today)
            .eq("status", "waiting"),
        // 在庫不足カウント
        serviceSupabase
            .from("menus")
            .select("id, stock_quantity, stock_alert_threshold")
            .eq("store_id", storeId)
            .eq("stock_enabled", true),
        // AIクレジット
        serviceSupabase
            .from("stores")
            .select("ai_credits")
            .eq("id", storeId)
            .single(),
        // 招待中カウント（有効期限が切れていないもの）
        serviceSupabase
            .from("invitations")
            .select("id, expires_at")
            .eq("store_id", storeId)
            .eq("status", "pending"),
    ]);

    // ========== STAGE 3: 依存クエリ ==========
    // 現在のユーザーのロールに基づいてシフトリクエストをフィルター
    const currentUserRole = currentProfile.role;
    const filteredOpenRequests = (openShiftRequestsResult.data || []).filter((request: { id: string; target_roles: string[] | null; target_profile_ids: string[] | null }) => {
        // target_profile_idsが指定されている場合
        if (request.target_profile_ids && request.target_profile_ids.length > 0) {
            return request.target_profile_ids.includes(profileId);
        }
        // target_rolesが指定されている場合
        if (request.target_roles && request.target_roles.length > 0) {
            if (currentUserRole === "admin" || currentUserRole === "staff") {
                return request.target_roles.includes("staff");
            }
            return request.target_roles.includes(currentUserRole);
        }
        return true;
    });
    const openRequestIds = filteredOpenRequests.map((r: { id: string }) => r.id);
    const routeIds = todayRoutesResult.data?.map((r: { id: string }) => r.id) || [];
    const todaySessionIds = todaySalesResult.data?.map((s: { id: string }) => s.id) || [];

    const [userSubmissionsResult, assignedPassengersResult, todayOrdersResult] = await Promise.all([
        openRequestIds.length > 0
            ? serviceSupabase
                .from("shift_submissions")
                .select("shift_request_id:shift_request_dates!inner(shift_request_id)")
                .eq("profile_id", profileId)
                .in("shift_request_dates.shift_request_id", openRequestIds)
            : Promise.resolve({ data: [] as { shift_request_id: { shift_request_id: string } }[] }),
        routeIds.length > 0
            ? serviceSupabase
                .from("pickup_passengers")
                .select("cast_profile_id")
                .in("route_id", routeIds)
            : Promise.resolve({ data: [] as { cast_profile_id: string }[] }),
        todaySessionIds.length > 0
            ? serviceSupabase
                .from("orders")
                .select("menu_id, quantity, cast_id, amount, item_name")
                .in("table_session_id", todaySessionIds)
            : Promise.resolve({ data: [] as { menu_id: string; quantity: number; cast_id: string | null; amount: number; item_name: string | null }[] }),
    ]);

    // ========== 結果の処理 ==========
    const activeTimeCards = activeTimeCardsResult.data || [];
    const activeCastCount = activeTimeCards.filter((tc: { user_id: string }) => castProfileIds.includes(tc.user_id)).length;
    const activeStaffCount = activeTimeCards.filter((tc: { user_id: string }) => staffProfileIds.includes(tc.user_id)).length;

    const todayShifts = todayShiftsResult.data || [];
    const scheduledCastCount = todayShifts.filter((s: { profile_id: string }) => castProfileIds.includes(s.profile_id)).length;
    const scheduledStaffCount = todayShifts.filter((s: { profile_id: string }) => staffProfileIds.includes(s.profile_id)).length;

    const nextShiftDate = nextShiftResult.data?.shift_request_dates?.target_date || null;

    const submittedRequestIds = new Set(userSubmissionsResult.data?.map((s: { shift_request_id: { shift_request_id: string } }) => s.shift_request_id.shift_request_id) || []);
    const unsubmittedShiftRequestCount = openRequestIds.filter((id: string) => !submittedRequestIds.has(id)).length;

    // 送迎リクエストを営業日でフィルタリング
    const filteredPickupRequests = (pickupRequestsResult.data || []).filter((tc: { user_id: string; clock_in: string; pickup_destination: string | null }) => {
        if (!tc.clock_in || !tc.pickup_destination) return false;
        const clockInDate = new Date(tc.clock_in);
        const clockInJST = new Date(clockInDate.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
        const clockInHour = clockInJST.getHours();
        const clockInMinute = clockInJST.getMinutes();
        const clockInDateStr = clockInJST.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).replace(/\//g, "-");

        if (clockInHour > switchHour || (clockInHour === switchHour && clockInMinute >= switchMinute)) {
            return clockInDateStr === businessDate;
        } else {
            const prevDate = new Date(clockInJST);
            prevDate.setDate(prevDate.getDate() - 1);
            const prevDateStr = prevDate.toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).replace(/\//g, "-");
            return prevDateStr === businessDate;
        }
    });
    // 同じユーザーの重複を排除（最新のclock_inを使用）
    const pickupUserMap = new Map<string, { user_id: string; clock_in: string }>();
    for (const tc of filteredPickupRequests) {
        const existing = pickupUserMap.get(tc.user_id);
        if (!existing || tc.clock_in > existing.clock_in) {
            pickupUserMap.set(tc.user_id, tc);
        }
    }
    const pickupRequests = Array.from(pickupUserMap.values());
    const pickupRequestCount = pickupRequests.length;
    const assignedProfileIds = new Set(assignedPassengersResult.data?.map((p: { cast_profile_id: string }) => p.cast_profile_id) || []);
    const unassignedPickupCount = pickupRequests.filter((r: { user_id: string }) => !assignedProfileIds.has(r.user_id)).length;

    const activeSessions = activeSessionsResult.data || [];
    const activeTableCount = activeSessions.length;
    const activeGuestCount = activeSessions.reduce((sum: number, s: { guest_count: number | null }) => sum + (s.guest_count || 0), 0);

    const featureFlags = ["show_dashboard", "show_attendance", "show_timecard", "show_users", "show_roles", "show_menus", "show_shifts"] as const;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storeAsAny = store as any;
    const enabledFeaturesCount = featureFlags.filter((f) => storeAsAny?.[f] === true).length;
    const disabledFeaturesCount = featureFlags.filter((f) => storeAsAny?.[f] === false).length;

    // 未読カウントの計算
    const allPostIds = allPublishedPostsResult.data?.map((p: { id: string }) => p.id) || [];
    const readPostIds = new Set(userReadPostsResult.data?.map((r: { post_id: string }) => r.post_id) || []);
    const unreadPostsCount = allPostIds.filter((id: string) => !readPostIds.has(id)).length;

    const allManualIds = allPublishedManualsResult.data?.map((m: { id: string }) => m.id) || [];
    const readManualIds = new Set(userReadManualsResult.data?.map((r: { manual_id: string }) => r.manual_id) || []);
    const unreadManualsCount = allManualIds.filter((id: string) => !readManualIds.has(id)).length;

    // ランキングTOP3の計算（キャストのみ）
    const rankingTop3: RankingItem[] = (() => {
        const castSalesMap = new Map<string, number>();
        const castIdSet = new Set(castProfileIds);

        for (const order of todayOrdersResult.data || []) {
            if (!order.cast_id) continue;
            if (!castIdSet.has(order.cast_id)) continue;

            const currentSales = castSalesMap.get(order.cast_id) || 0;
            const orderAmount = (order.amount || 0) * (order.quantity || 1);
            castSalesMap.set(order.cast_id, currentSales + orderAmount);
        }

        const profileDisplayNameMap = new Map<string, string>(
            (allProfiles || [])
                .filter((p: DashboardProfile) => p.role === "cast")
                .map((p: DashboardProfile) => [p.id, p.display_name || "不明"])
        );

        const sortedCasts = Array.from(castSalesMap.entries())
            .map(([castId, sales]) => ({
                name: profileDisplayNameMap.get(castId) || "不明",
                sales,
            }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 3);

        return sortedCasts;
    })();

    // 本日の給与計算
    const todayPayroll = (() => {
        const castIdSet = new Set(castProfileIds);

        // キャストの給与システムマップを構築
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const castSalarySystemMap = new Map<string, any>();
        for (const tc of todayTimeCardsForPayrollResult.data || []) {
            if (tc.profiles?.profile_salary_systems?.[0]?.salary_systems) {
                castSalarySystemMap.set(tc.user_id, tc.profiles.profile_salary_systems[0].salary_systems);
            }
        }

        // メニューのキャストバックマップ
        const menuCastBackMap = new Map<string, number>(
            (menusForPayrollResult.data || []).map((m: { id: string; cast_back_amount: number }) => [m.id, m.cast_back_amount || 0])
        );

        // 注文からバック金額を計算
        const backTotal = (todayOrdersResult.data || []).reduce((sum: number, o: { cast_id: string | null; menu_id: string; quantity: number; amount: number; item_name: string | null }) => {
            if (!o.cast_id || !castIdSet.has(o.cast_id)) return sum;

            const quantity = o.quantity || 1;
            const salarySystem = castSalarySystemMap.get(o.cast_id);

            const itemName = o.item_name || "";
            let backSettings: SalaryBackSettings | null = null;

            if (itemName.includes("指名") && !itemName.includes("場内")) {
                backSettings = salarySystem?.shimei_back_settings;
            } else if (itemName.includes("場内")) {
                backSettings = salarySystem?.jounai_back_settings;
            } else if (itemName.includes("同伴")) {
                backSettings = salarySystem?.douhan_back_settings;
            } else if (o.menu_id) {
                backSettings = salarySystem?.store_back_settings;
            }

            const itemPrice = o.amount || 0;
            const defaultCastBack = o.menu_id ? (menuCastBackMap.get(o.menu_id) || 0) : 0;

            return sum + calculateBackAmount(backSettings, itemPrice, quantity, defaultCastBack);
        }, 0);

        // タイムカードから時給を計算
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hourlyTotal = (todayTimeCardsForPayrollResult.data || []).reduce((sum: number, tc: any) => {
            if (!tc.clock_in) return sum;
            if (!castIdSet.has(tc.user_id)) return sum;

            const clockIn = new Date(tc.clock_in);
            let clockOut = tc.clock_out ? new Date(tc.clock_out) : new Date();

            // 日付をまたぐ場合の処理
            if (clockOut.getTime() < clockIn.getTime()) {
                clockOut = new Date(clockOut.getTime() + 24 * 60 * 60 * 1000);
            }

            const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
            const hourlySettings = tc.profiles?.profile_salary_systems?.[0]?.salary_systems?.hourly_settings;
            const hourlyRate = hourlySettings?.amount || 0;

            return sum + Math.floor(hoursWorked * hourlyRate);
        }, 0);

        return hourlyTotal + backTotal;
    })();

    // 招待中カウント（有効期限が切れていないもの）
    const now = new Date();
    const pendingInvitationsCount = ((pendingInvitationsResult.data || []) as { id: string; expires_at: string }[])
        .filter(inv => new Date(inv.expires_at) >= now).length;

    return {
        data: {
            currentProfile,
            storeName,
            // シフトタブ
            activeCastCount,
            activeStaffCount,
            scheduledCastCount,
            scheduledStaffCount,
            currentUserTimeCard: currentUserTimeCardResult.data,
            lastClockIn: lastClockInResult.data,
            nextShiftDate,
            unsubmittedShiftRequestCount,
            pickupRequestCount,
            unassignedPickupCount,
            // ユーザータブ
            castCount,
            staffCount,
            guestCount,
            partnerCount,
            rolesCount: rolesCountResult.count || 0,
            pendingInvitationsCount,
            pendingJoinRequestsCount,
            pendingResumesCount: pendingResumesCountResult.count || 0,
            // フロアタブ
            tablesCount: tablesCountResult.count || 0,
            activeTableCount,
            activeGuestCount,
            unpaidSlipsCount: unpaidSlipsCountResult.count || 0,
            menusCount: menusCountResult.count || 0,
            activeBottleKeepsCount: activeBottleKeepsCountResult.count || 0,
            waitingQueueCount: waitingQueueCountResult.count || 0,
            todayReservationsCount: todayReservationsCountResult.count || 0,
            lowStockCount: ((lowStockCountResult.data || []) as { id: string; stock_quantity: number; stock_alert_threshold: number }[])
                .filter(m => m.stock_quantity <= (m.stock_alert_threshold ?? 3)).length,
            // 給与タブ
            pricingSystemsCount: pricingSystemsCountResult.count || 0,
            salarySystemsCount: salarySystemsCountResult.count || 0,
            rankingTop3,
            todaySales: (todaySalesResult.data || []).reduce((sum: number, s: { total_amount: number | null }) => sum + (s.total_amount || 0), 0),
            todayPayroll,
            // コミュニティタブ
            postsCount: postsCountResult.count || 0,
            manualsCount: manualsCountResult.count || 0,
            unreadPostsCount,
            unreadManualsCount,
            todaySnsPostsCount: todaySnsPostsCountResult.count || 0,
            scheduledSnsPostsCount: scheduledSnsPostsCountResult.count || 0,
            enabledFeaturesCount,
            disabledFeaturesCount,
            aiCredits: aiCreditsResult.data?.ai_credits ?? 0,
        }
    };
}
