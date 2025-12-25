"use client";

import { useQuery } from "@tanstack/react-query";
import { ShiftsClient } from "./shifts-client";
import { getShiftsPageData } from "./actions";
import { useAuthHelpers } from "@/app/app/hooks";

function ShiftsSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-7 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="flex gap-2">
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
            </div>
            <div className="flex items-center justify-center gap-4">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="grid grid-cols-7 gap-2">
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className="h-6 bg-gray-200 dark:bg-gray-700 rounded" />
                    ))}
                    {[...Array(35)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700/50 rounded-lg" />
                    ))}
                </div>
            </div>
        </div>
    );
}

export function ShiftsPageClient() {
    const { isLoading: isAuthLoading, hasAccess, canEdit } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["shifts", "pageData"],
        queryFn: getShiftsPageData,
        staleTime: 60 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <ShiftsSkeleton />;
    }

    if (isAuthLoading || isDataLoading || !data?.data) {
        return <ShiftsSkeleton />;
    }

    if (!hasAccess("shifts")) {
        window.location.href = "/app/me";
        return <ShiftsSkeleton />;
    }

    const pageData = data.data;

    return (
        <ShiftsClient
            initialCalendarData={pageData.initialCalendarData}
            profiles={pageData.profiles}
            storeId={pageData.storeId}
            profileId={pageData.profileId}
            storeDefaults={pageData.storeDefaults}
            storeName={pageData.storeName}
            existingDates={pageData.existingDates}
            closedDays={pageData.closedDays}
            daySwitchTime={pageData.daySwitchTime}
            openShiftRequests={pageData.openShiftRequests}
            canEdit={canEdit("shifts")}
            pagePermissions={pageData.pagePermissions}
        />
    );
}
