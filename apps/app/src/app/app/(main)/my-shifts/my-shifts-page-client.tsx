"use client";

import { useQuery } from "@tanstack/react-query";
import { MyShiftsClient } from "./my-shifts-client";
import { getMyShiftsPageData } from "./actions";

function MyShiftsSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-7 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />

            {/* Calendar skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="flex gap-2">
                        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {[...Array(35)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
                    ))}
                </div>
            </div>

            {/* Shifts list skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                        <div className="flex-1 space-y-1">
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function MyShiftsPageClient() {
    const { data, isLoading } = useQuery({
        queryKey: ["my-shifts", "pageData"],
        queryFn: getMyShiftsPageData,
        staleTime: 60 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <MyShiftsSkeleton />;
    }

    if (isLoading || !data?.data) {
        return <MyShiftsSkeleton />;
    }

    return (
        <MyShiftsClient
            shiftRequests={data.data.shiftRequests}
            profileId={data.data.profileId}
            profileRole={data.data.profileRole}
            storeDefaults={data.data.storeDefaults}
            approvedShifts={data.data.approvedShifts}
            submittedRequestIds={data.data.submittedRequestIds}
        />
    );
}
