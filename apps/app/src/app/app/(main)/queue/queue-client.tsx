"use client";

import { useQuery } from "@tanstack/react-query";
import { QueueList } from "./queue-list";
import { getQueuePageData } from "./actions";
import { useAuthHelpers } from "@/app/app/hooks";

function QueueSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="flex gap-2">
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
            </div>
            <div className="grid gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function QueueClient() {
    const { isLoading: isAuthLoading, hasAccess, canEdit } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["queue", "pageData"],
        queryFn: getQueuePageData,
        staleTime: 30 * 1000,
    });

    if (isAuthLoading || isDataLoading || !data) {
        return <QueueSkeleton />;
    }

    if (!hasAccess("queue")) {
        window.location.href = "/app/me";
        return <QueueSkeleton />;
    }

    return (
        <QueueList
            entries={data.entries}
            storeId={data.storeId}
            storeName={data.storeName}
            settings={data.settings}
            daySwitchTime={data.daySwitchTime}
            canEdit={canEdit("queue")}
        />
    );
}
