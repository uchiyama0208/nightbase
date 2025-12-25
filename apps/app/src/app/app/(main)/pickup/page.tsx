import type { Metadata } from "next";
import { Suspense } from "react";
import { PickupWrapper } from "./pickup-wrapper";

export const metadata: Metadata = {
    title: "送迎",
};

function PickupSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 h-32" />
            <div className="grid gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 h-24" />
                ))}
            </div>
        </div>
    );
}

export default function PickupPage() {
    return (
        <Suspense fallback={<PickupSkeleton />}>
            <PickupWrapper />
        </Suspense>
    );
}
