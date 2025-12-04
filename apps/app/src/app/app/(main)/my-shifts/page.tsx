import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAppData } from "../../data-access";
import { MyShiftsClient } from "./my-shifts-client";
import { getMyShiftRequests, getStoreDefaults } from "./actions";

export const metadata: Metadata = {
    title: "マイシフト",
};

function MyShiftsSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-3xl" />
        </div>
    );
}

export default async function MyShiftsPage() {
    const { user, profile } = await getAppData();

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    const [shiftRequests, storeDefaults] = await Promise.all([
        getMyShiftRequests(profile.id, profile.store_id, profile.role),
        getStoreDefaults(profile.store_id),
    ]);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    マイシフト
                </h1>
                <p className="mt-2 text-sm text-muted-foreground dark:text-gray-400">
                    シフト希望を提出できます。
                </p>
            </div>

            <Suspense fallback={<MyShiftsSkeleton />}>
                <MyShiftsClient
                    shiftRequests={shiftRequests}
                    profileId={profile.id}
                    profileRole={profile.role}
                    storeDefaults={storeDefaults}
                />
            </Suspense>
        </div>
    );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
