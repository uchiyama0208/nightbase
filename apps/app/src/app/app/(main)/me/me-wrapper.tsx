"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { MeContent } from "./me-content";
import { StoreActionsModal } from "./store-actions-modal";
import { getMePageData } from "./actions";

function MeSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Profile header */}
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="space-y-2">
                    <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>

            {/* Store selector */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>

            {/* Menu items */}
            <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function MeWrapper() {
    const { data, isLoading } = useQuery({
        queryKey: ["me", "pageData"],
        queryFn: getMePageData,
        staleTime: 60 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <MeSkeleton />;
    }

    if (isLoading || !data?.data) {
        return <MeSkeleton />;
    }

    return (
        <>
            <MeContent
                avatarUrl={data.data.avatarUrl}
                displayName={data.data.displayName}
                profiles={data.data.profiles}
                currentProfileId={data.data.currentProfileId}
                currentStore={data.data.currentStore}
                timeCards={data.data.timeCards}
                scheduledShifts={data.data.scheduledShifts}
            />

            {/* Store Actions Modal */}
            <Suspense fallback={null}>
                <StoreActionsModal />
            </Suspense>
        </>
    );
}
