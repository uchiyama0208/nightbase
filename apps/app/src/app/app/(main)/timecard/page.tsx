import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import { ClockButtons } from "./clock-in-button";
import { getTimecardData } from "./actions";
import { TimecardHistory } from "./timecard-history";

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
    const params = await searchParams;
    const result = await getTimecardData();

    // Handle redirect
    if ('redirect' in result && result.redirect) {
        redirect(result.redirect);
    }

    if (!result.data) {
        redirect('/app/me');
    }

    const { timeCards, profile, storeSettings, showBreakColumns, latestTimeCard, pickupHistory } = result.data!;
    const autoOpenModal = params.openModal === "true";
    const autoClockOut = params.clockOut === "true";

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    タイムカード
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    出勤・退勤の打刻と勤務履歴を確認できます。
                </p>
            </div>

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

            <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">勤務履歴</h2>
                <TimecardHistory timeCards={timeCards} showBreakColumns={showBreakColumns} />
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
