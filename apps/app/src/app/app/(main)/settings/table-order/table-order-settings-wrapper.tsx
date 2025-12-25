"use client";

import { useQuery } from "@tanstack/react-query";
import { TableOrderSettings } from "./table-order-settings";
import { getTableOrderPageData } from "./actions";
import { useAuthHelpers } from "@/app/app/hooks";

function TableOrderSettingsSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <div className="flex-1 flex items-center justify-center px-4 py-2">
                    <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="flex-1 flex items-center justify-center px-4 py-2">
                    <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                    <div className="h-6 w-11 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
                <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="mt-3 h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>
        </div>
    );
}

export function TableOrderSettingsWrapper() {
    const { isLoading: isAuthLoading, hasAccess } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["settings", "table-order", "pageData"],
        queryFn: getTableOrderPageData,
        staleTime: 60 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <TableOrderSettingsSkeleton />;
    }

    if (isAuthLoading || isDataLoading || !data || !("data" in data) || !data.data) {
        return <TableOrderSettingsSkeleton />;
    }

    if (!hasAccess("settings")) {
        window.location.href = "/app/me";
        return <TableOrderSettingsSkeleton />;
    }

    const { tables, storeId, tabletOrderEnabled, qrOrderEnabled } = data.data;

    return (
        <TableOrderSettings
            tables={tables}
            storeId={storeId}
            initialTabletOrderEnabled={tabletOrderEnabled}
            initialQrOrderEnabled={qrOrderEnabled}
        />
    );
}
