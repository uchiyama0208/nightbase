"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { UsersTable } from "./users-table";
import { getUsersPageData, getProfiles } from "./actions";
import { useAuthHelpers } from "@/app/app/hooks";

function UsersSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-7 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="flex gap-2">
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
            </div>
            <div className="flex gap-2">
                <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
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
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function UsersPageClient() {
    const searchParams = useSearchParams();
    const roleParam = searchParams.get("role") || "cast";
    const { isLoading: isAuthLoading, hasAccess, canEdit } = useAuthHelpers();

    const { data: pageData, isLoading: isPageDataLoading } = useQuery({
        queryKey: ["users", "pageData"],
        queryFn: getUsersPageData,
        staleTime: 60 * 1000,
    });

    const { data: profiles, isLoading: isProfilesLoading } = useQuery({
        queryKey: ["users", "profiles"],
        queryFn: getProfiles,
        staleTime: 60 * 1000,
    });

    // リダイレクト処理
    if (pageData && "redirect" in pageData && pageData.redirect) {
        window.location.href = pageData.redirect;
        return <UsersSkeleton />;
    }

    if (isAuthLoading || isPageDataLoading || isProfilesLoading || !pageData?.data || !profiles) {
        return <UsersSkeleton />;
    }

    if (!hasAccess("users")) {
        window.location.href = "/app/me";
        return <UsersSkeleton />;
    }

    return (
        <UsersTable
            profiles={profiles}
            roleFilter={roleParam}
            hidePersonalInfo={pageData.data.hidePersonalInfo}
            canEdit={canEdit("users")}
            pagePermissions={pageData.data.pagePermissions}
        />
    );
}
