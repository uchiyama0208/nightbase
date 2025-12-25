"use client";

import { useQuery } from "@tanstack/react-query";
import { MenuList } from "./menu-list";
import { getMenusData, getStoreLocationInfo } from "./actions";
import { useAuthHelpers } from "@/app/app/hooks";

function MenusSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <div className="flex gap-2 overflow-x-auto">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
                ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-3xl p-4 border border-gray-200 dark:border-gray-700 h-32">
                        <div className="space-y-3">
                            <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function MenusClient() {
    const { isLoading: isAuthLoading, hasAccess, canEdit } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["menus", "pageData"],
        queryFn: getMenusData,
        staleTime: 60 * 1000,
    });

    const { data: storeInfo } = useQuery({
        queryKey: ["menus", "storeInfo"],
        queryFn: getStoreLocationInfo,
        staleTime: 5 * 60 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <MenusSkeleton />;
    }

    if (isAuthLoading || isDataLoading || !data?.data) {
        return <MenusSkeleton />;
    }

    if (!hasAccess("menus")) {
        window.location.href = "/app/me";
        return <MenusSkeleton />;
    }

    return (
        <MenuList
            initialMenus={data.data.menus}
            categories={data.data.categories}
            canEdit={canEdit("menus")}
            storeInfo={storeInfo ?? undefined}
        />
    );
}
