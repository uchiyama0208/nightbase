import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Users, UserCog } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { createServerClient } from "@/lib/supabaseServerClient";
import { createServiceRoleClient } from "@/lib/supabaseServiceClient";
import { WorkingTimeCard } from "./working-time-card";
import { ClockInCard } from "./clock-in-card";

export const metadata: Metadata = {
    title: "ダッシュボード",
};

// Server Component - データをサーバー側で取得
async function getDashboardData() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Resolve current profile via users.current_profile_id
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        redirect("/app/me");
    }

    // Fetch current profile with store information
    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("*, stores(*)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile || !currentProfile.store_id) {
        redirect("/app/me");
    }

    const store = currentProfile.stores as any;
    if (store && store.show_dashboard === false) {
        redirect("/app/timecard");
    }

    const storeName = store ? store.name : null;
    const storeId = currentProfile.store_id;

    // 集計には service role クライアントを使用
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
    const now = new Date();
    const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const today = jstDate.toISOString().split("T")[0];
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

    // Get last completed clock-in
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
        currentProfile,
        storeName,
        activeCastCount,
        activeStaffCount,
        currentUserTimeCard,
        lastClockIn,
    };
}

// Skeleton for cards
function DashboardSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
        </div>
    );
}

// Server Component (default export)
export default async function DashboardPage() {
    const data = await getDashboardData();
    const { currentProfile, storeName, activeCastCount, activeStaffCount, currentUserTimeCard, lastClockIn } = data;

    return (
        <>
            <div className="space-y-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        ようこそ、{currentProfile?.display_name || "ゲスト"}さん
                    </h1>
                    <p className="mt-2 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                        {storeName ? `${storeName} - ` : ""}現在の出勤状況を確認できます。
                    </p>
                </div>

                {/* Clock-In Card - Only shown when user is NOT clocked in */}
                {!currentUserTimeCard?.clock_in && (
                    <Suspense fallback={<div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div>}>
                        <ClockInCard
                            lastWorkDate={lastClockIn?.work_date}
                            clockIn={lastClockIn?.clock_in}
                            clockOut={lastClockIn?.clock_out}
                        />
                    </Suspense>
                )}

                {/* Working Time Card - Only shown when user is clocked in */}
                {currentUserTimeCard?.clock_in && (
                    <Suspense fallback={<div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div>}>
                        <WorkingTimeCard clockInTime={currentUserTimeCard.clock_in} />
                    </Suspense>
                )}

                <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    <Link href="/app/attendance?role=cast" className="block">
                        <Card className="shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">
                                    出勤中のキャスト
                                </CardTitle>
                                <Users className="h-4 w-4 text-gray-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{activeCastCount}名</div>
                                <p className="text-xs text-gray-500 mt-1">現在稼働中</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/app/attendance?role=staff" className="block">
                        <Card className="shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">
                                    出勤中のスタッフ
                                </CardTitle>
                                <UserCog className="h-4 w-4 text-gray-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{activeStaffCount}名</div>
                                <p className="text-xs text-gray-500 mt-1">現在稼働中</p>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>
        </>
    );
}

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
