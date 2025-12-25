"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { PickupClient } from "./PickupClient";
import { getPickupData } from "./actions";
import { useAuthHelpers } from "@/app/app/hooks";

function PickupSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 h-32" />
            <div className="grid gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 h-24" />
                ))}
            </div>
        </div>
    );
}

export function PickupWrapper() {
    const searchParams = useSearchParams();
    const dateParam = searchParams.get("date") || undefined;
    const { isLoading: isAuthLoading, hasAccess, canEdit } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["pickup", "pageData", dateParam],
        queryFn: () => getPickupData(dateParam),
        staleTime: 60 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <PickupSkeleton />;
    }

    if (isAuthLoading || isDataLoading || !data || !("data" in data)) {
        return <PickupSkeleton />;
    }

    if (!hasAccess("pickup")) {
        window.location.href = "/app/me";
        return <PickupSkeleton />;
    }

    const { routes, todayAttendees, staffProfiles, allProfiles, currentProfileId, targetDate, storeId, storeLocation, daySwitchTime } = data.data;

    return (
        <PickupClient
            initialRoutes={routes}
            initialAttendees={todayAttendees}
            staffProfiles={staffProfiles}
            allProfiles={allProfiles}
            currentProfileId={currentProfileId}
            initialDate={targetDate}
            storeId={storeId}
            storeAddress={storeLocation.address || undefined}
            canEdit={canEdit("pickup")}
            daySwitchTime={daySwitchTime}
        />
    );
}
