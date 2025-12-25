"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { getNewManualPageData } from "../../actions";
import { ManualEditor } from "../../ManualEditor";

function ManualEditorSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6 space-y-5">
                <div className="space-y-1.5">
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-11 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
                </div>
                <div className="space-y-2">
                    <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="flex gap-2">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        ))}
                    </div>
                </div>
                <div className="space-y-1.5">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="min-h-[400px] border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function NewManualWrapper() {
    const { data, isLoading } = useQuery({
        queryKey: ["board", "new-manual"],
        queryFn: getNewManualPageData,
        staleTime: 60 * 1000,
    });

    if (isLoading || !data) {
        return <ManualEditorSkeleton />;
    }

    if ("redirect" in data && data.redirect) {
        if (typeof window !== "undefined") {
            window.location.href = data.redirect;
        }
        return <ManualEditorSkeleton />;
    }

    if (!("data" in data) || !data.data) {
        return <ManualEditorSkeleton />;
    }

    return (
        <ManualEditor
            manual={null}
            storeId={data.data.storeId}
            availableTags={data.data.tags}
        />
    );
}
