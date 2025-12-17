import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl, hasPagePermission } from "../../data-access";
import { ShiftsClient } from "./shifts-client";
import { getCalendarData, getStoreShiftDefaults, getExistingRequestDates, getShiftRequests } from "./actions";

export const metadata: Metadata = {
    title: "シフト管理",
};

async function getProfiles(storeId: string) {
    const supabase = await createServerClient() as any;

    const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, role, line_user_id, status")
        .eq("store_id", storeId)
        .in("role", ["cast", "staff", "admin"])
        .order("display_name", { ascending: true });

    return data || [];
}

async function getStoreInfo(storeId: string) {
    const supabase = await createServerClient() as any;

    const [storeResult, settingsResult] = await Promise.all([
        supabase
            .from("stores")
            .select("name, closed_days")
            .eq("id", storeId)
            .single(),
        supabase
            .from("store_settings")
            .select("day_switch_time")
            .eq("store_id", storeId)
            .single(),
    ]);

    return {
        name: storeResult.data?.name || "店舗",
        closedDays: (storeResult.data?.closed_days as string[]) || [],
        daySwitchTime: settingsResult.data?.day_switch_time || "05:00",
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
    const { user, profile, hasAccess, canEdit, permissions } = await getAppDataWithPermissionCheck("shifts", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("shifts"));
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [calendarData, profiles, storeDefaults, storeInfo, existingDates, shiftRequests] = await Promise.all([
        getCalendarData(profile.store_id, year, month),
        getProfiles(profile.store_id),
        getStoreShiftDefaults(profile.store_id),
        getStoreInfo(profile.store_id),
        getExistingRequestDates(profile.store_id),
        getShiftRequests(profile.store_id),
    ]);

    // 募集中のシフトのみフィルター
    const openShiftRequests = shiftRequests.filter((r) => r.status === "open");

    // 各ページの権限をチェック
    const pagePermissions = {
        bottles: hasPagePermission("bottles", "view", profile, permissions ?? null),
        resumes: hasPagePermission("resumes", "view", profile, permissions ?? null),
        salarySystems: hasPagePermission("salary-systems", "view", profile, permissions ?? null),
        attendance: hasPagePermission("attendance", "view", profile, permissions ?? null),
        personalInfo: hasPagePermission("users-personal-info", "view", profile, permissions ?? null),
    };

    return (
        <Suspense fallback={<ShiftsSkeleton />}>
            <ShiftsClient
                initialCalendarData={calendarData}
                profiles={profiles}
                storeId={profile.store_id}
                profileId={profile.id}
                storeDefaults={storeDefaults}
                storeName={storeInfo.name}
                existingDates={existingDates}
                closedDays={storeInfo.closedDays}
                daySwitchTime={storeInfo.daySwitchTime}
                openShiftRequests={openShiftRequests}
                canEdit={canEdit}
                pagePermissions={pagePermissions}
            />
        </Suspense>
    );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
