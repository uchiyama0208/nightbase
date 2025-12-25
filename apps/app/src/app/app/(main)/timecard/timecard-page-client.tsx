"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { ClockButtons } from "./clock-in-button";
import { TimecardHistory } from "./timecard-history";
import { getTimecardData } from "./actions";
import { useAuthHelpers } from "@/app/app/hooks";

function TimecardSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>
            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                <div className="p-4 space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between py-2">
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function TimecardPageClient() {
    const searchParams = useSearchParams();
    const autoOpenModal = searchParams.get("openModal") === "true";
    const autoClockOut = searchParams.get("clockOut") === "true";
    const { isLoading: isAuthLoading, hasAccess } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["timecard", "pageData"],
        queryFn: getTimecardData,
        staleTime: 30 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <TimecardSkeleton />;
    }

    if (isAuthLoading || isDataLoading || !data?.data) {
        return <TimecardSkeleton />;
    }

    if (!hasAccess("timecard")) {
        window.location.href = "/app/me";
        return <TimecardSkeleton />;
    }

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 md:p-6 lg:p-8 shadow-sm">
                <ClockButtons
                    latestTimeCard={data.data.latestTimeCard}
                    storeSettings={data.data.storeSettings}
                    showBreakButtons={data.data.showBreakColumns}
                    pickupHistory={data.data.pickupHistory}
                    autoOpenModal={autoOpenModal}
                    autoClockOut={autoClockOut}
                    pickupEnabled={data.data.pickupEnabled}
                />
            </div>

            <TimecardHistory timeCards={data.data.timeCards} showBreakColumns={data.data.showBreakColumns} />
        </div>
    );
}
