import type { Metadata } from "next";
import { Suspense } from "react";
import { SalarySystemsWrapper } from "./salary-systems-wrapper";

export const metadata: Metadata = {
    title: "給与システム",
};

function SalarySystemsSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
    );
}

export default function SalarySystemsPage() {
    return (
        <Suspense fallback={<SalarySystemsSkeleton />}>
            <SalarySystemsWrapper />
        </Suspense>
    );
}
