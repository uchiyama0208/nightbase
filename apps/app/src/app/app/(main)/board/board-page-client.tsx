"use client";

import { useQuery } from "@tanstack/react-query";
import { BoardClient } from "./BoardClient";
import { getBoardPageData } from "./actions";

function BoardSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="flex gap-2">
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>

            {/* Post Cards */}
            <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function BoardPageClient() {
    const { data, isLoading } = useQuery({
        queryKey: ["board", "pageData"],
        queryFn: getBoardPageData,
        staleTime: 60 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <BoardSkeleton />;
    }

    if (isLoading || !data?.data) {
        return <BoardSkeleton />;
    }

    return (
        <BoardClient
            posts={data.data.posts}
            manuals={data.data.manuals}
            manualTags={data.data.manualTags}
            storeId={data.data.storeId}
            isStaff={data.data.isStaff}
            userRole={data.data.userRole}
            postLikeCounts={data.data.postLikeCounts}
            postReadStatus={data.data.postReadStatus}
            manualLikeCounts={data.data.manualLikeCounts}
            manualReadStatus={data.data.manualReadStatus}
            canEdit={data.data.canEdit}
        />
    );
}
