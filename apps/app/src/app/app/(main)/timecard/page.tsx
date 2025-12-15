import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClockButtons } from "./clock-in-button";
import { getTimecardData } from "./actions";
import { TimecardHistory } from "./timecard-history";
import Link from "next/link";
import { Settings } from "lucide-react";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "../../data-access";

export const metadata: Metadata = {
    title: "タイムカード",
};

function TimecardSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
    );
}

export default async function TimecardPage({
    searchParams,
}: {
    searchParams: Promise<{ openModal?: string; clockOut?: string }>;
}) {
    const { user, profile, hasAccess } = await getAppDataWithPermissionCheck("timecard", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("timecard"));
    }

    const params = await searchParams;
    const result = await getTimecardData();

    // Handle redirect
    if ('redirect' in result && result.redirect) {
        redirect(result.redirect);
    }

    if (!result.data) {
        redirect('/app/me');
    }

    const { timeCards, profile: timecardProfile, storeSettings, showBreakColumns, latestTimeCard, pickupHistory } = result.data!;
    const autoOpenModal = params.openModal === "true";
    const autoClockOut = params.clockOut === "true";

    return (
        <div className="space-y-4">
            <Suspense fallback={<div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>}>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 md:p-6 lg:p-8 shadow-sm">
                    <ClockButtons
                        latestTimeCard={latestTimeCard}
                        storeSettings={storeSettings}
                        showBreakButtons={showBreakColumns}
                        pickupHistory={pickupHistory}
                        autoOpenModal={autoOpenModal}
                        autoClockOut={autoClockOut}
                    />
                </div>
            </Suspense>

            <TimecardHistory timeCards={timeCards} showBreakColumns={showBreakColumns} />
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
