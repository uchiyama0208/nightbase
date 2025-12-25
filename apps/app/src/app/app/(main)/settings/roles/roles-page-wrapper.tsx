"use client";

import { useQuery } from "@tanstack/react-query";
import { RolesPageClient } from "./roles-client";
import { getRolesPageData } from "./actions";
import { useAuthHelpers } from "@/app/app/hooks";

function RolesSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <div className="flex gap-2">
                <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function RolesPageWrapper() {
    const { isLoading: isAuthLoading, hasAccess, canEdit } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["roles", "pageData"],
        queryFn: getRolesPageData,
        staleTime: 60 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <RolesSkeleton />;
    }

    if (isAuthLoading || isDataLoading || !data?.data) {
        return <RolesSkeleton />;
    }

    if (!hasAccess("roles")) {
        window.location.href = "/app/me";
        return <RolesSkeleton />;
    }

    return (
        <RolesPageClient
            roles={data.data.roles}
            profiles={data.data.profiles}
            currentProfileId={data.data.currentProfileId}
            currentRole={data.data.currentRole}
            canEdit={canEdit("roles")}
            storeFeatures={data.data.storeFeatures}
        />
    );
}
