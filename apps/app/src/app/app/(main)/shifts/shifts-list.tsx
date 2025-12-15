"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ShiftDayData {
    hasRequest: boolean;
    requestClosed?: boolean;
    castCount: number;
    staffCount: number;
    requestDateId?: string;
    // キャスト別カウント
    castConfirmed?: number;
    castSubmitted?: number;
    castNotSubmitted?: number;
    // スタッフ別カウント
    staffConfirmed?: number;
    staffSubmitted?: number;
    staffNotSubmitted?: number;
}

interface ShiftDay extends ShiftDayData {
    date: string;
}

interface ShiftSubmission {
    id: string;
    profile_id: string;
    availability: string;
    status: string;
    preferred_start_time: string | null;
    preferred_end_time: string | null;
    profiles?: {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
        role: string;
        line_is_friend?: boolean;
    } | null;
}

interface ShiftsListProps {
    calendarData: { [date: string]: ShiftDayData };
    storeId: string;
    profileId: string;
    storeName: string;
    onLoadDateSubmissions: (requestDateId: string) => Promise<ShiftSubmission[]>;
    onDateClick: (date: string, requestDateId?: string) => void;
}

type FilterType = "all" | "today";

export function ShiftsList({ calendarData, onDateClick }: ShiftsListProps) {
    const [filter, setFilter] = useState<FilterType>("all");
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 今日の日付を取得
    const today = new Date().toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");

    // 月の全日付を生成
    const shiftDays = useMemo(() => {
        const days: ShiftDay[] = [];
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const m = String(month + 1).padStart(2, "0");
            const d = String(day).padStart(2, "0");
            const dateKey = `${year}-${m}-${d}`;
            const data = calendarData[dateKey];

            days.push({
                date: dateKey,
                hasRequest: data?.hasRequest ?? false,
                requestClosed: data?.requestClosed ?? false,
                castCount: data?.castCount ?? 0,
                staffCount: data?.staffCount ?? 0,
                requestDateId: data?.requestDateId,
                castConfirmed: data?.castConfirmed ?? 0,
                castSubmitted: data?.castSubmitted ?? 0,
                castNotSubmitted: data?.castNotSubmitted ?? 0,
                staffConfirmed: data?.staffConfirmed ?? 0,
                staffSubmitted: data?.staffSubmitted ?? 0,
                staffNotSubmitted: data?.staffNotSubmitted ?? 0,
            });
        }

        return days;
    }, [calendarData, year, month]);

    // フィルター適用
    const filteredDays = useMemo(() => {
        if (filter === "today") {
            return shiftDays.filter((day) => day.date === today);
        }
        return shiftDays;
    }, [shiftDays, filter, today]);

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const handleDayClick = (day: ShiftDay) => {
        onDateClick(day.date, day.requestDateId);
    };

    // 今日タグをクリックしたとき、今日の月に移動してフィルターを適用
    const handleTodayFilter = () => {
        const now = new Date();
        setCurrentDate(now);
        setFilter("today");
    };

    return (
        <>
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-3">
                <button
                    onClick={goToPreviousMonth}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        {year}年{month + 1}月
                    </h2>
                    <button
                        onClick={goToToday}
                        className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        今月
                    </button>
                </div>
                <button
                    onClick={goToNextMonth}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
            </div>

            {/* Filter Tags */}
            <div className="flex gap-2 mb-4">
                <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        filter === "all"
                            ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                >
                    すべて
                </button>
                <button
                    type="button"
                    onClick={handleTodayFilter}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        filter === "today"
                            ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                >
                    今日
                </button>
            </div>

            {/* Shift Day Cards */}
            {filteredDays.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    シフトがありません
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredDays.map((day) => {
                        const isToday = day.date === today;
                        const hasData = day.hasRequest || day.castCount > 0 || day.staffCount > 0;

                        return (
                            <button
                                key={day.date}
                                type="button"
                                onClick={() => handleDayClick(day)}
                                className={`w-full rounded-xl border p-3 text-left transition-all hover:shadow-md ${
                                    isToday
                                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700"
                                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                }`}
                            >
                                {/* 1行目: 日付と確定人数 */}
                                <div className="flex items-center justify-between">
                                    <div className={`text-base font-semibold ${
                                        isToday
                                            ? "text-blue-600 dark:text-blue-400"
                                            : "text-gray-900 dark:text-white"
                                    }`}>
                                        {formatDisplayDate(day.date)}
                                    </div>
                                    {/* 確定人数を右側に表示 */}
                                    {hasData && (
                                        <div className="flex items-center gap-2">
                                            {day.castCount > 0 && (
                                                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400">
                                                    {day.castCount}
                                                </span>
                                            )}
                                            {day.staffCount > 0 && (
                                                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                                    {day.staffCount}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {/* 2行目: ステータスバッジ */}
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    {/* 募集中 / 募集終了 / 未募集 */}
                                    {day.hasRequest ? (
                                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                            募集中
                                        </span>
                                    ) : day.requestClosed ? (
                                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                            募集終了
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500">
                                            未募集
                                        </span>
                                    )}
                                    {/* 未確認（提出済み） */}
                                    {((day.castSubmitted ?? 0) > 0 || (day.staffSubmitted ?? 0) > 0) && (
                                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                            未確認 {(day.castSubmitted ?? 0) + (day.staffSubmitted ?? 0)}件
                                        </span>
                                    )}
                                    {/* 未提出 */}
                                    {((day.castNotSubmitted ?? 0) > 0 || (day.staffNotSubmitted ?? 0) > 0) && (
                                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                            未提出 {(day.castNotSubmitted ?? 0) + (day.staffNotSubmitted ?? 0)}件
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </>
    );
}

function formatDisplayDate(dateStr: string): string {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
    return `${month}/${day}(${weekDays[date.getDay()]})`;
}
