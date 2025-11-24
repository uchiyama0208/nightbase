import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ClockButtons } from "./clock-in-button";
import { getTimecardData } from "./actions";

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

    const formatDateTime = (dateString: string | null) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const calculateWorkTime = (card: any) => {
        if (!card.clock_in) return "-";

        const clockIn = new Date(card.clock_in);
        const clockOut = card.clock_out ? new Date(card.clock_out) : new Date();

        let workMinutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);

        if (card.break_start && card.break_end) {
            const breakStart = new Date(card.break_start);
            const breakEnd = new Date(card.break_end);
            const breakMinutes = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60);
            workMinutes -= breakMinutes;
        }

        const hours = Math.floor(workMinutes / 60);
        const minutes = Math.floor(workMinutes % 60);

        return `${hours}時間${minutes}分`;
    };

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    タイムカード
                </h1>
                <p className="mt-2 text-xs md:text-sm text-gray-600 dark:text-gray-400">
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
                <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">勤務履歴</h2>
                <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
                    <div className="min-w-full">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <TableHead className="min-w-[90px] px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400">勤務日</TableHead>
                                    <TableHead className="min-w-[90px] px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400">出勤</TableHead>
                                    <TableHead className="min-w-[90px] px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400">退勤</TableHead>
                                    {showBreakColumns && (
                                        <>
                                            <TableHead className="hidden md:table-cell min-w-[90px] px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400">休憩開始</TableHead>
                                            <TableHead className="hidden md:table-cell min-w-[90px] px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400">休憩終了</TableHead>
                                        </>
                                    )}
                                    <TableHead className="min-w-[80px] px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400">勤務時間</TableHead>
                                    <TableHead className="min-w-[90px] px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400">送迎先</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {timeCards?.map((card: any) => (
                                    <TableRow key={card.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <TableCell className="font-medium text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white">{card.work_date}</TableCell>
                                        <TableCell className="text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white">{formatDateTime(card.clock_in)}</TableCell>
                                        <TableCell className="text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white">{formatDateTime(card.clock_out)}</TableCell>
                                        {showBreakColumns && (
                                            <>
                                                <TableCell className="hidden md:table-cell text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white">
                                                    {formatDateTime(card.break_start)}
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white">
                                                    {formatDateTime(card.break_end)}
                                                </TableCell>
                                            </>
                                        )}
                                        <TableCell className="font-medium text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white">{calculateWorkTime(card)}</TableCell>
                                        <TableCell className="text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white">{card.pickup_destination || card.pickup_location || "-"}</TableCell>
                                    </TableRow>
                                ))}
                                {(!timeCards || timeCards.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={showBreakColumns ? 7 : 5} className="h-24 text-center text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                            勤務履歴がありません
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
