"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { AttendanceTable } from "./AttendanceTable";
import { getAttendancePageData } from "./actions";
import { useAuthHelpers } from "@/app/app/hooks";

function AttendanceSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="flex gap-2">
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
            </div>
            <div className="flex gap-2">
                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function AttendancePageClient() {
    const searchParams = useSearchParams();
    const roleParam = searchParams.get("role") || "cast";
    const { isLoading: isAuthLoading, hasAccess, canEdit } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["attendance", "pageData"],
        queryFn: getAttendancePageData,
        staleTime: 30 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <AttendanceSkeleton />;
    }

    if (isAuthLoading || isDataLoading || !data?.data) {
        return <AttendanceSkeleton />;
    }

    if (!hasAccess("attendance")) {
        window.location.href = "/app/me";
        return <AttendanceSkeleton />;
    }

    return (
        <AttendanceTable
            attendanceRecords={data.data.allRecords}
            profiles={data.data.allProfiles}
            roleFilter={roleParam}
            canEdit={canEdit("attendance")}
            pagePermissions={data.data.pagePermissions}
            pickupEnabledCast={data.data.pickupEnabledCast}
            pickupEnabledStaff={data.data.pickupEnabledStaff}
            showBreakColumns={data.data.showBreakColumns}
        />
    );
}
