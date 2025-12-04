import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import { getAppData } from "../../data-access";
import { ShiftsClient } from "./shifts-client";
import { getShiftRequests, getCalendarData, getStoreShiftDefaults, getExistingRequestDates } from "./actions";

export const metadata: Metadata = {
    title: "シフト管理",
};

async function getProfiles(storeId: string) {
    const supabase = await createServerClient();

    const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, role, line_user_id, status")
        .eq("store_id", storeId)
        .in("role", ["cast", "staff", "admin"])
        .order("display_name", { ascending: true });

    return data || [];
}

async function getStoreInfo(storeId: string) {
    const supabase = await createServerClient();

    const { data } = await supabase
        .from("stores")
        .select("name, closed_days")
        .eq("id", storeId)
        .single();

    return {
        name: data?.name || "店舗",
        closedDays: (data?.closed_days as string[]) || [],
    };
}

function ShiftsSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-3xl" />
        </div>
    );
}

export default async function ShiftsPage() {
    const { user, profile } = await getAppData();

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    // admin/staffのみアクセス可能
    if (!["admin", "staff"].includes(profile.role)) {
        redirect("/app/me");
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [shiftRequests, calendarData, profiles, storeDefaults, storeInfo, existingDates] = await Promise.all([
        getShiftRequests(profile.store_id),
        getCalendarData(profile.store_id, year, month),
        getProfiles(profile.store_id),
        getStoreShiftDefaults(profile.store_id),
        getStoreInfo(profile.store_id),
        getExistingRequestDates(profile.store_id),
    ]);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    シフト管理
                </h1>
                <p className="mt-2 text-sm text-muted-foreground dark:text-gray-400">
                    シフト募集の作成と提出状況の管理ができます。
                </p>
            </div>

            <Suspense fallback={<ShiftsSkeleton />}>
                <ShiftsClient
                    shiftRequests={shiftRequests}
                    initialCalendarData={calendarData}
                    profiles={profiles}
                    storeId={profile.store_id}
                    profileId={profile.id}
                    storeDefaults={storeDefaults}
                    storeName={storeInfo.name}
                    existingDates={existingDates}
                    closedDays={storeInfo.closedDays}
                />
            </Suspense>
        </div>
    );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
