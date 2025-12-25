"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthHelpers } from "@/app/app/hooks";
import { BottleList } from "./bottle-list";
import { getBottlesPageData } from "./actions";

function BottlesSkeleton() {
    return (
        <div className="space-y-4 animate-pulse p-4">
            <div className="flex items-center justify-between">
                <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function BottleListClient() {
    const { isLoading: isAuthLoading, canEdit, hasAccess } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["bottles", "pageData"],
        queryFn: getBottlesPageData,
        staleTime: 60 * 1000,
    });

    if (isAuthLoading || isDataLoading || !data) {
        return <BottlesSkeleton />;
    }

    if (!hasAccess("bottles")) {
        window.location.href = "/app/me";
        return <BottlesSkeleton />;
    }

    return (
        <BottleList
            storeId={data.storeId}
            menus={data.menus}
            profiles={data.profiles}
            canEdit={canEdit("bottles")}
            pagePermissions={data.pagePermissions}
        />
    );
}
