import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAppData } from "../../data-access";
import { MyShiftsClient } from "./my-shifts-client";
import { getMyShiftRequests, getStoreDefaults, getApprovedShifts, getSubmittedRequestIds } from "./actions";

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

    const [shiftRequests, storeDefaults, approvedShifts] = await Promise.all([
        getMyShiftRequests(profile.id, profile.store_id, profile.role),
        getStoreDefaults(profile.store_id),
        getApprovedShifts(profile.id, profile.store_id),
    ]);

    // 提出済みのシフトリクエストIDを取得
    const requestIds = shiftRequests.map((r: any) => r.id);
    const submittedRequestIdsSet = await getSubmittedRequestIds(profile.id, requestIds);
    const submittedRequestIds = Array.from(submittedRequestIdsSet) as string[];

    return (
        <Suspense fallback={<MyShiftsSkeleton />}>
            <MyShiftsClient
                shiftRequests={shiftRequests}
                profileId={profile.id}
                profileRole={profile.role}
                storeDefaults={storeDefaults}
                approvedShifts={approvedShifts}
                submittedRequestIds={submittedRequestIds}
            />
        </Suspense>
    );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
