"use client";

import { useQuery } from "@tanstack/react-query";
import { SnsClient } from "./SnsClient";
import { getSnsPageData } from "./actions";
import { useAuthHelpers } from "@/app/app/hooks";

function SnsSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <div className="flex gap-2 overflow-x-auto">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
                ))}
            </div>
            <div className="grid gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 h-24" />
                ))}
            </div>
        </div>
    );
}

export function SnsClientWrapper() {
    const { isLoading: isAuthLoading, hasAccess, canEdit } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["sns", "pageData"],
        queryFn: getSnsPageData,
        staleTime: 60 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data) {
        window.location.href = data.redirect;
        return <SnsSkeleton />;
    }

    if (isAuthLoading || isDataLoading || !data) {
        return <SnsSkeleton />;
    }

    if (!hasAccess("sns")) {
        window.location.href = "/app/me";
        return <SnsSkeleton />;
    }

    const pageData = data.data;

    return (
        <SnsClient
            storeId={pageData.storeId}
            storeName={pageData.storeName}
            accounts={pageData.accounts}
            templates={pageData.templates}
            scheduledPosts={pageData.scheduledPosts}
            postHistory={pageData.postHistory}
            recurringSchedules={pageData.recurringSchedules}
            canEdit={canEdit("sns")}
        />
    );
}
