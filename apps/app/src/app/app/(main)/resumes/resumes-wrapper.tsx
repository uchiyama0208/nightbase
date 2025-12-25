"use client";

import { useQuery } from "@tanstack/react-query";
import { ResumesClient } from "./resumes-client";
import { getResumesPageData } from "./actions";
import { useAuthHelpers } from "@/app/app/hooks";

function ResumesSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <div className="flex gap-2">
                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <div className="grid gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 h-24" />
                ))}
            </div>
        </div>
    );
}

export function ResumesWrapper() {
    const { isLoading: isAuthLoading, hasAccess, canEdit } = useAuthHelpers();

    const { data, isLoading: isDataLoading } = useQuery({
        queryKey: ["resumes", "pageData"],
        queryFn: getResumesPageData,
        staleTime: 60 * 1000,
    });

    // リダイレクト処理
    if (data && "redirect" in data && data.redirect) {
        window.location.href = data.redirect;
        return <ResumesSkeleton />;
    }

    if (isAuthLoading || isDataLoading || !data?.data) {
        return <ResumesSkeleton />;
    }

    if (!hasAccess("resumes")) {
        window.location.href = "/app/me";
        return <ResumesSkeleton />;
    }

    return (
        <div className="space-y-4">
            <ResumesClient
                submissions={data.data.submissions}
                templates={data.data.templates}
                storeId={data.data.storeId}
                canEdit={canEdit("resumes")}
            />
        </div>
    );
}
