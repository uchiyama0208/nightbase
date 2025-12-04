"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { getCalendarData } from "./actions";

interface CalendarData {
    [date: string]: {
        hasRequest: boolean;
        castCount: number;
        staffCount: number;
        requestDateId?: string;
    };
}

interface ShiftsCalendarProps {
    initialData: CalendarData;
    storeId: string;
    onDateClick: (date: string, requestDateId?: string) => void;
}

export function ShiftsCalendar({ initialData, storeId, onDateClick }: ShiftsCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarData, setCalendarData] = useState<CalendarData>(initialData);
    const [isLoading, setIsLoading] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month and number of days
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const days: (number | null)[] = [];
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }
        return days;
    }, [daysInMonth, startingDayOfWeek]);

    const loadMonthData = useCallback(async (y: number, m: number) => {
        setIsLoading(true);
        try {
            const data = await getCalendarData(storeId, y, m + 1);
            setCalendarData(data);
        } catch (error) {
            console.error("Failed to load calendar data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [storeId]);

    const goToPreviousMonth = () => {
        const newDate = new Date(year, month - 1, 1);
        setCurrentDate(newDate);
        loadMonthData(newDate.getFullYear(), newDate.getMonth());
    };

    const goToNextMonth = () => {
        const newDate = new Date(year, month + 1, 1);
        setCurrentDate(newDate);
        loadMonthData(newDate.getFullYear(), newDate.getMonth());
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        loadMonthData(today.getFullYear(), today.getMonth());
    };

    const formatDateKey = (day: number) => {
        const m = String(month + 1).padStart(2, "0");
        const d = String(day).padStart(2, "0");
        return `${year}-${m}-${d}`;
    };

    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
    const today = new Date();
    const isToday = (day: number) => {
        return (
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day
        );
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Calendar Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={goToPreviousMonth}
                    disabled={isLoading}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        {year}年{month + 1}月
                    </h2>
                    <button
                        onClick={goToToday}
                        disabled={isLoading}
                        className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                        今日
                    </button>
                </div>
                <button
                    onClick={goToNextMonth}
                    disabled={isLoading}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                    <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
                {weekDays.map((day, idx) => (
                    <div
                        key={day}
                        className={`py-2 text-center text-xs font-medium ${
                            idx === 0
                                ? "text-red-500"
                                : idx === 6
                                ? "text-blue-500"
                                : "text-gray-500 dark:text-gray-400"
                        }`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className={`grid grid-cols-7 ${isLoading ? "opacity-50" : ""}`}>
                {calendarDays.map((day, index) => {
                    if (day === null) {
                        return (
                            <div
                                key={`empty-${index}`}
                                className="min-h-[80px] border-b border-r border-gray-100 dark:border-gray-800 last:border-r-0"
                            />
                        );
                    }

                    const dateKey = formatDateKey(day);
                    const data = calendarData[dateKey];
                    const dayOfWeek = (startingDayOfWeek + day - 1) % 7;
                    const isSunday = dayOfWeek === 0;
                    const isSaturday = dayOfWeek === 6;
                    const hasScheduled = data && (data.castCount > 0 || data.staffCount > 0);

                    return (
                        <button
                            key={day}
                            type="button"
                            onClick={() => onDateClick(dateKey, data?.requestDateId)}
                            disabled={isLoading}
                            className={`min-h-[80px] p-1.5 border-b border-r border-gray-100 dark:border-gray-800 last:border-r-0 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 disabled:pointer-events-none ${
                                isToday(day) ? "bg-blue-50 dark:bg-blue-900/20" : ""
                            }`}
                        >
                            {/* Day Number */}
                            <div
                                className={`text-xs font-medium mb-1 ${
                                    isToday(day)
                                        ? "text-blue-600 dark:text-blue-400"
                                        : isSunday
                                        ? "text-red-500"
                                        : isSaturday
                                        ? "text-blue-500"
                                        : "text-gray-700 dark:text-gray-300"
                                }`}
                            >
                                {day}
                            </div>

                            {/* Request Indicator */}
                            {data?.hasRequest && (
                                <div className="mb-1">
                                    <span className="inline-block w-2 h-2 rounded-full bg-orange-400" />
                                </div>
                            )}

                            {/* Scheduled Staff Count */}
                            {hasScheduled && (
                                <div className="space-y-0.5">
                                    {data.castCount > 0 && (
                                        <div className="flex items-center gap-0.5 text-[10px] leading-tight px-1 py-0.5 rounded bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400">
                                            <Users className="h-2.5 w-2.5" />
                                            <span>キャスト {data.castCount}</span>
                                        </div>
                                    )}
                                    {data.staffCount > 0 && (
                                        <div className="flex items-center gap-0.5 text-[10px] leading-tight px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                            <Users className="h-2.5 w-2.5" />
                                            <span>スタッフ {data.staffCount}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                    <span>シフト募集あり</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-pink-100 dark:bg-pink-900/30" />
                    <span>キャスト確定</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900/30" />
                    <span>スタッフ確定</span>
                </div>
            </div>
        </div>
    );
}
