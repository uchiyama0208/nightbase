"use client";

import { useQuery } from "@tanstack/react-query";
import { AICreateContent } from "./ai-create-content";
import { getAICreatePageData } from "./actions";
import { useAuthHelpers } from "@/app/app/hooks";

function AICreateSkeleton() {
    return (
        <div className="max-w-4xl mx-auto p-4 animate-pulse">
            <div className="flex items-center justify-between mb-8">
                <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-2xl" />
                ))}
            </div>
            <div className="space-y-4">
                <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-xl" />
                <div className="h-32 w-full bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
        </div>
    );
}

export function AICreateWrapper() {
    const { isLoading: isAuthLoading, canEdit } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["ai-create", "pageData"],
        queryFn: getAICreatePageData,
        staleTime: 60 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <AICreateSkeleton />;
    }

    if (isAuthLoading || isDataLoading || !data || !("data" in data) || !data.data) {
        return <AICreateSkeleton />;
    }

    const { credits, images } = data.data;

    return (
        <AICreateContent
            initialCredits={credits}
            initialHistory={images}
            canEdit={canEdit("ai-create")}
        />
    );
}
