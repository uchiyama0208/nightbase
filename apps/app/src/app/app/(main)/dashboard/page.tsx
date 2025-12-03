
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
import { getAppData } from "../../data-access";
import { LinePrompt } from "./line-prompt";

export const metadata: Metadata = {
    title: "ダッシュボード",
};

// Server Component - データをサーバー側で取得
async function getDashboardData() {
    const { user, profile } = await getAppData();

    if (!user) {
        redirect("/login");
    }

    if (!profile) {
        redirect("/onboarding/choice");
    }

    if (!profile.store_id) {
        // Profile exists but no store - redirect to store creation
        redirect("/onboarding/store-info");
    }

    const store = profile.stores as any;
    if (store && store.show_dashboard === false) {
        redirect("/app/timecard");
    }

    const storeName = store ? store.name : null;
    const storeId = profile.store_id;

    // 集計には service role クライアントを使用
    const serviceSupabase = createServiceRoleClient();

    // Parallelize independent fetches
    // Get today's date in JST
    const today = new Date().toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");

    // Parallelize all fetches
    const [activeTimeCardsResult, currentUserTimeCardResult, lastClockInResult] = await Promise.all([
        // Fetch active timecards with roles in one go
        serviceSupabase
            .from("time_cards")
            .select("user_id, profiles!inner(role)")
            .eq("profiles.store_id", storeId)
            .eq("work_date", today)
            .is("clock_out", null)
            .returns<{ user_id: string; profiles: { role: string } }[]>(),

        // Check if current user is clocked in
        serviceSupabase
            .from("time_cards")
            .select("clock_in")
            .eq("user_id", profile.id)
            .eq("work_date", today)
            .is("clock_out", null)
            .maybeSingle()
            .returns<{ clock_in: string } | null>(),

        // Get last completed clock-in
        serviceSupabase
            .from("time_cards")
            .select("work_date, clock_in, clock_out")
            .eq("user_id", profile.id)
            .not("clock_out", "is", null)
            .order("work_date", { ascending: false })
            .order("clock_in", { ascending: false })
            .limit(1)
            .maybeSingle()
            .returns<{ work_date: string; clock_in: string; clock_out: string } | null>()
    ]);

    const activeTimeCards = activeTimeCardsResult.data || [];

    // Count based on returned roles
    const activeCastCount = activeTimeCards.filter(tc => tc.profiles.role === 'cast').length;
    const activeStaffCount = activeTimeCards.filter(tc => ['staff', 'admin'].includes(tc.profiles.role)).length;

    const currentUserTimeCard = currentUserTimeCardResult.data;
    const lastClockIn = lastClockInResult.data;

    return {
        currentProfile: profile,
        storeName,
        activeCastCount,
        activeStaffCount,
        currentUserTimeCard,
        lastClockIn,
        hasLineId: !!profile.line_user_id,
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
    const { currentProfile, storeName, activeCastCount, activeStaffCount, currentUserTimeCard, lastClockIn, hasLineId } = data;

    return (
        <>
            {/* LINE Prompt - shows when LINE linked but not a friend of official account */}
            <LinePrompt hasLineId={hasLineId} />

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
