import { Suspense } from "react";
import type { Metadata } from "next";
import { MyShiftsPageClient } from "./my-shifts-page-client";

export const metadata: Metadata = {
    title: "マイシフト",
};

function MyShiftsSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-7 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="flex gap-2">
                        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {[...Array(35)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function MyShiftsPage() {
    return (
        <Suspense fallback={<MyShiftsSkeleton />}>
            <MyShiftsPageClient />
        </Suspense>
    );
}
