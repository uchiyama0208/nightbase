"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { createServiceRoleClient } from "@/lib/supabaseServiceClient";

export async function getDashboardData() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { redirect: "/login" };
    }

    // Resolve current profile via users.current_profile_id
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return { redirect: "/app/me" };
    }

    // Fetch current profile with store information
    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("*, stores(*)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile || !currentProfile.store_id) {
        return { redirect: "/app/me" };
    }

    const store = currentProfile.stores as any;
    if (store && store.show_dashboard === false) {
        return { redirect: "/app/timecard" };
    }

    const storeName = store ? store.name : null;
    const storeId = currentProfile.store_id;

    // 集計には service role クライアントを使用して、店舗内の全プロフィール/打刻を取得する
    const serviceSupabase = createServiceRoleClient();

    // Fetch all profiles for this store to filter timecards
    const { data: storeProfiles } = await serviceSupabase
        .from("profiles")
        .select("id, role")
        .eq("store_id", storeId)
        .returns<{ id: string; role: string }[]>();

    const storeProfileIds = storeProfiles?.map(p => p.id) || [];
    const castProfileIds = storeProfiles?.filter(p => p.role === 'cast').map(p => p.id) || [];
    const staffProfileIds = storeProfiles?.filter(p => ['staff', 'admin'].includes(p.role)).map(p => p.id) || [];

    // Fetch active timecards for today
    const today = new Date().toISOString().split("T")[0];
    const { data: activeTimeCards } = await serviceSupabase
        .from("time_cards")
        .select("user_id")
        .eq("work_date", today)
        .is("clock_out", null)
        .in("user_id", storeProfileIds)
        .returns<{ user_id: string }[]>();

    const activeCastCount = activeTimeCards?.filter(tc => castProfileIds.includes(tc.user_id)).length || 0;
    const activeStaffCount = activeTimeCards?.filter(tc => staffProfileIds.includes(tc.user_id)).length || 0;

    // Check if current user is clocked in
    const { data: currentUserTimeCard } = await serviceSupabase
        .from("time_cards")
        .select("clock_in")
        .eq("user_id", appUser.current_profile_id)
        .eq("work_date", today)
        .is("clock_out", null)
        .maybeSingle()
        .returns<{ clock_in: string } | null>();

    // Get last completed clock-in (for users not currently clocked in)
    const { data: lastClockIn } = await serviceSupabase
        .from("time_cards")
        .select("work_date, clock_in, clock_out")
        .eq("user_id", appUser.current_profile_id)
        .not("clock_out", "is", null)
        .order("work_date", { ascending: false })
        .order("clock_in", { ascending: false })
        .limit(1)
        .maybeSingle()
        .returns<{ work_date: string; clock_in: string; clock_out: string } | null>();

    return {
        data: {
            currentProfile,
            storeName,
            activeCastCount,
            activeStaffCount,
            currentUserTimeCard,
            lastClockIn,
        }
    };
}
