"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { createServiceRoleClient } from "@/lib/supabaseServiceClient";
import { getJSTDateString } from "@/lib/utils";
import type { Store } from "@/types/common";

export async function getDashboardData() {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { redirect: "/login" };
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return { redirect: "/app/me" };
    }

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("*, stores(*)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile || !currentProfile.store_id) {
        return { redirect: "/app/me" };
    }

    const store = currentProfile.stores as Store | null;
    if (store?.show_dashboard === false) {
        return { redirect: "/app/timecard" };
    }

    const storeName = store?.name ?? null;
    const storeId = currentProfile.store_id;
    const profileId = appUser.current_profile_id;
    const today = getJSTDateString();

    const serviceSupabase = createServiceRoleClient() as any;

    // ========== STAGE 1: Get profiles (needed for filtering) ==========
    const { data: allProfiles } = await serviceSupabase
        .from("profiles")
        .select("id, role, invite_status, approval_status")
        .eq("store_id", storeId);

    const storeProfileIds = allProfiles?.map((p: any) => p.id) || [];
    const castProfileIds = allProfiles?.filter((p: any) => p.role === 'cast').map((p: any) => p.id) || [];
    const staffProfileIds = allProfiles?.filter((p: any) => ['staff', 'admin'].includes(p.role)).map((p: any) => p.id) || [];

    // User tab counts from allProfiles
    const castCount = allProfiles?.filter((p: any) => p.role === 'cast').length || 0;
    const staffCount = allProfiles?.filter((p: any) => ['staff', 'admin'].includes(p.role)).length || 0;
    const guestCount = allProfiles?.filter((p: any) => p.role === 'guest').length || 0;
    const partnerCount = allProfiles?.filter((p: any) => p.role === 'partner').length || 0;
    const pendingInvitationsCount = allProfiles?.filter((p: any) => p.invite_status === 'pending').length || 0;
    const pendingJoinRequestsCount = allProfiles?.filter((p: any) => p.approval_status === 'pending').length || 0;

    // ========== STAGE 2: All independent queries in parallel ==========
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
        // Shift tab
        activeTimeCardsResult,
        currentUserTimeCardResult,
        lastClockInResult,
        todayShiftsResult,
        nextShiftResult,
        openShiftRequestsResult,
        pickupRequestsResult,
        todayRoutesResult,
        // User tab
        rolesCountResult,
        // Floor tab
        tablesCountResult,
        activeSessionsResult,
        unpaidSlipsCountResult,
        menusCountResult,
        activeBottleKeepsCountResult,
        // Salary tab
        pricingSystemsCountResult,
        salarySystemsCountResult,
        // Community tab
        postsCountResult,
        manualsCountResult,
        todaySnsPostsCountResult,
        scheduledSnsPostsCountResult,
        // Unread counts
        allPublishedPostsResult,
        allPublishedManualsResult,
        userReadPostsResult,
        userReadManualsResult,
    ] = await Promise.all([
        // Shift tab queries
        serviceSupabase
            .from("time_cards")
            .select("user_id")
            .eq("work_date", today)
            .is("clock_out", null)
            .in("user_id", storeProfileIds.length > 0 ? storeProfileIds : ['none'])
            ,
        serviceSupabase
            .from("time_cards")
            .select("clock_in")
            .eq("user_id", profileId)
            .eq("work_date", today)
            .is("clock_out", null)
            .maybeSingle()
            ,
        serviceSupabase
            .from("time_cards")
            .select("work_date, clock_in, clock_out")
            .eq("user_id", profileId)
            .not("clock_out", "is", null)
            .order("work_date", { ascending: false })
            .order("clock_in", { ascending: false })
            .limit(1)
            .maybeSingle()
            ,
        serviceSupabase
            .from("shift_submissions")
            .select(`profile_id, status, shift_request_dates!inner(target_date, shift_requests!inner(store_id))`)
            .eq("status", "approved")
            .eq("shift_request_dates.target_date", today)
            .eq("shift_request_dates.shift_requests.store_id", storeId)
            ,
        serviceSupabase
            .from("shift_submissions")
            .select(`shift_request_dates!inner(target_date, shift_requests!inner(store_id))`)
            .eq("profile_id", profileId)
            .eq("status", "approved")
            .eq("shift_request_dates.shift_requests.store_id", storeId)
            .gt("shift_request_dates.target_date", today)
            .order("shift_request_dates(target_date)", { ascending: true })
            .limit(1)
            .maybeSingle()
            ,
        serviceSupabase
            .from("shift_requests")
            .select("id")
            .eq("store_id", storeId)
            .eq("status", "open")
            .gt("deadline", new Date().toISOString())
            ,
        serviceSupabase
            .from("time_cards")
            .select("user_id")
            .eq("work_date", today)
            .eq("pickup_required", true)
            .in("user_id", storeProfileIds.length > 0 ? storeProfileIds : ['none'])
            ,
        serviceSupabase
            .from("pickup_routes")
            .select("id")
            .eq("store_id", storeId)
            .eq("date", today)
            ,
        // User tab queries
        serviceSupabase
            .from("store_roles")
            .select("id", { count: 'exact', head: true })
            .eq("store_id", storeId),
        // Floor tab queries
        serviceSupabase
            .from("tables")
            .select("id", { count: 'exact', head: true })
            .eq("store_id", storeId),
        serviceSupabase
            .from("table_sessions")
            .select("id, guest_count")
            .eq("store_id", storeId)
            .eq("status", "active")
            ,
        serviceSupabase
            .from("table_sessions")
            .select("id", { count: 'exact', head: true })
            .eq("store_id", storeId)
            .neq("status", "closed"),
        serviceSupabase
            .from("menus")
            .select("id", { count: 'exact', head: true })
            .eq("store_id", storeId),
        serviceSupabase
            .from("bottle_keeps")
            .select("id", { count: 'exact', head: true })
            .eq("store_id", storeId)
            .gt("remaining_amount", 0),
        // Salary tab queries
        serviceSupabase
            .from("pricing_systems")
            .select("id", { count: 'exact', head: true })
            .eq("store_id", storeId),
        serviceSupabase
            .from("salary_systems")
            .select("id", { count: 'exact', head: true })
            .eq("store_id", storeId),
        // Community tab queries
        serviceSupabase
            .from("store_posts")
            .select("id", { count: 'exact', head: true })
            .eq("store_id", storeId)
            .eq("status", "published"),
        serviceSupabase
            .from("store_manuals")
            .select("id", { count: 'exact', head: true })
            .eq("store_id", storeId)
            .eq("status", "published"),
        serviceSupabase
            .from("sns_scheduled_posts")
            .select("id", { count: 'exact', head: true })
            .eq("store_id", storeId)
            .eq("status", "posted")
            .gte("scheduled_at", todayStart.toISOString())
            .lte("scheduled_at", todayEnd.toISOString()),
        serviceSupabase
            .from("sns_scheduled_posts")
            .select("id", { count: 'exact', head: true })
            .eq("store_id", storeId)
            .eq("status", "scheduled")
            .gt("scheduled_at", new Date().toISOString()),
        // Unread posts query - get all published posts
        serviceSupabase
            .from("store_posts")
            .select("id")
            .eq("store_id", storeId)
            .eq("status", "published")
            .eq("type", "board")
            ,
        // Unread manuals query - get all published manuals
        serviceSupabase
            .from("store_manuals")
            .select("id")
            .eq("store_id", storeId)
            .eq("status", "published")
            ,
        // Get user's read posts
        serviceSupabase
            .from("post_reads")
            .select("post_id")
            .eq("profile_id", profileId)
            ,
        // Get user's read manuals
        serviceSupabase
            .from("manual_reads")
            .select("manual_id")
            .eq("profile_id", profileId)
            ,
    ]);

    // ========== STAGE 3: Dependent queries ==========
    const openRequestIds = openShiftRequestsResult.data?.map((r: any) => r.id) || [];
    const routeIds = todayRoutesResult.data?.map((r: any) => r.id) || [];

    const [userSubmissionsResult, assignedPassengersResult] = await Promise.all([
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
    ]);

    // ========== Process results ==========
    const activeTimeCards = activeTimeCardsResult.data || [];
    const activeCastCount = activeTimeCards.filter((tc: any) => castProfileIds.includes(tc.user_id)).length;
    const activeStaffCount = activeTimeCards.filter((tc: any) => staffProfileIds.includes(tc.user_id)).length;

    const todayShifts = todayShiftsResult.data || [];
    const scheduledCastCount = todayShifts.filter((s: any) => castProfileIds.includes(s.profile_id)).length;
    const scheduledStaffCount = todayShifts.filter((s: any) => staffProfileIds.includes(s.profile_id)).length;

    const nextShiftDate = nextShiftResult.data?.shift_request_dates?.target_date || null;

    const submittedRequestIds = new Set(userSubmissionsResult.data?.map((s: any) => s.shift_request_id.shift_request_id) || []);
    const unsubmittedShiftRequestCount = openRequestIds.filter((id: any) => !submittedRequestIds.has(id)).length;

    const pickupRequests = pickupRequestsResult.data || [];
    const pickupRequestCount = pickupRequests.length;
    const assignedProfileIds = new Set(assignedPassengersResult.data?.map((p: any) => p.cast_profile_id) || []);
    const unassignedPickupCount = pickupRequests.filter((r: any) => !assignedProfileIds.has(r.user_id)).length;

    const activeSessions = activeSessionsResult.data || [];
    const activeTableCount = activeSessions.length;
    const activeGuestCount = activeSessions.reduce((sum: number, s: any) => sum + (s.guest_count || 0), 0);

    const featureFlags = ['show_dashboard', 'show_attendance', 'show_timecard', 'show_users', 'show_roles', 'show_menus', 'show_shifts'];
    const enabledFeaturesCount = featureFlags.filter((f: any) => (store as any)?.[f] === true).length;
    const disabledFeaturesCount = featureFlags.filter((f: any) => (store as any)?.[f] === false).length;

    // Calculate unread counts
    const allPostIds = allPublishedPostsResult.data?.map((p: any) => p.id) || [];
    const readPostIds = new Set(userReadPostsResult.data?.map((r: any) => r.post_id) || []);
    const unreadPostsCount = allPostIds.filter((id: any) => !readPostIds.has(id)).length;

    const allManualIds = allPublishedManualsResult.data?.map((m: any) => m.id) || [];
    const readManualIds = new Set(userReadManualsResult.data?.map((r: any) => r.manual_id) || []);
    const unreadManualsCount = allManualIds.filter((id: any) => !readManualIds.has(id)).length;

    return {
        data: {
            currentProfile,
            storeName,
            // Shift tab
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
            // User tab
            castCount,
            staffCount,
            guestCount,
            partnerCount,
            rolesCount: rolesCountResult.count || 0,
            pendingInvitationsCount,
            pendingJoinRequestsCount,
            // Floor tab
            tablesCount: tablesCountResult.count || 0,
            activeTableCount,
            activeGuestCount,
            unpaidSlipsCount: unpaidSlipsCountResult.count || 0,
            menusCount: menusCountResult.count || 0,
            activeBottleKeepsCount: activeBottleKeepsCountResult.count || 0,
            // Salary tab
            pricingSystemsCount: pricingSystemsCountResult.count || 0,
            salarySystemsCount: salarySystemsCountResult.count || 0,
            // Community tab
            postsCount: postsCountResult.count || 0,
            manualsCount: manualsCountResult.count || 0,
            unreadPostsCount,
            unreadManualsCount,
            todaySnsPostsCount: todaySnsPostsCountResult.count || 0,
            scheduledSnsPostsCount: scheduledSnsPostsCountResult.count || 0,
            enabledFeaturesCount,
            disabledFeaturesCount,
        }
    };
}
