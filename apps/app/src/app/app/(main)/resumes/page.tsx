import { Suspense } from "react";
import type { Metadata } from "next";
import { getAppData } from "../../data-access";
import { ResumesClient } from "./resumes-client";

export const metadata: Metadata = {
    title: "履歴書管理",
};

export default async function ResumesPage() {
    const { storeId } = await getAppData();

    return (
        <Suspense fallback={<ResumesSkeleton />}>
            <ResumesClient storeId={storeId} />
        </Suspense>
    );
}

function ResumesSkeleton() {
    return (
        <div className="container mx-auto py-8 px-4 max-w-5xl">
            <div className="space-y-4 animate-pulse">
                <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
        </div>
    );
}
