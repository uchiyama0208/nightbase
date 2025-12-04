"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, Building2 } from "lucide-react";
import { formatJSTTime } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface TimeCard {
    id: string;
    work_date: string;
    clock_in: string | null;
    clock_out: string | null;
    store_name: string;
    store_icon_url: string | null;
}

interface AttendanceCalendarProps {
    timeCards: TimeCard[];
}

export function AttendanceCalendar({ timeCards }: AttendanceCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month and number of days
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

    // Group time cards by date
    const timeCardsByDate = useMemo(() => {
        const map = new Map<string, TimeCard[]>();
        for (const card of timeCards) {
            const existing = map.get(card.work_date) || [];
            existing.push(card);
            map.set(card.work_date, existing);
        }
        return map;
    }, [timeCards]);

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const days: (number | null)[] = [];

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }

        return days;
    }, [daysInMonth, startingDayOfWeek]);

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
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
                        今日
                    </button>
                </div>
                <button
                    onClick={goToNextMonth}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
            <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                    if (day === null) {
                        return (
                            <div
                                key={`empty-${index}`}
                                className="min-h-[60px] border-b border-r border-gray-100 dark:border-gray-800 last:border-r-0"
                            />
                        );
                    }

                    const dateKey = formatDateKey(day);
                    const cards = timeCardsByDate.get(dateKey) || [];
                    const dayOfWeek = (startingDayOfWeek + day - 1) % 7;
                    const isSunday = dayOfWeek === 0;
                    const isSaturday = dayOfWeek === 6;

                    return (
                        <button
                            key={day}
                            type="button"
                            onClick={() => setSelectedDate(dateKey)}
                            className={`min-h-[60px] p-1 border-b border-r border-gray-100 dark:border-gray-800 last:border-r-0 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                                isToday(day) ? "bg-blue-50 dark:bg-blue-900/20" : ""
                            }`}
                        >
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
                            {cards.map((card) => (
                                <div
                                    key={card.id}
                                    className="text-[10px] leading-tight px-1 py-0.5 mb-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 truncate"
                                >
                                    {card.store_name.slice(0, 4)}
                                    {card.clock_in && (
                                        <span className="ml-0.5">
                                            {formatJSTTime(card.clock_in).slice(0, 5)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </button>
                    );
                })}
            </div>

            {/* Legend / Summary */}
            {timeCards.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    出勤記録がありません
                </div>
            )}

            {/* Day Detail Modal */}
            <Dialog open={selectedDate !== null} onOpenChange={(open) => !open && setSelectedDate(null)}>
                <DialogContent className="sm:max-w-[400px] bg-white dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">
                            {selectedDate && formatSelectedDate(selectedDate)}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        {selectedDate && (timeCardsByDate.get(selectedDate) || []).length === 0 ? (
                            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                この日の出勤記録はありません
                            </div>
                        ) : (
                            selectedDate && (timeCardsByDate.get(selectedDate) || []).map((card) => (
                                <div
                                    key={card.id}
                                    className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 space-y-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {card.store_name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            <span className="text-gray-600 dark:text-gray-300">出勤</span>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {card.clock_in ? formatJSTTime(card.clock_in) : "-"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />
                                            <span className="text-gray-600 dark:text-gray-300">退勤</span>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {card.clock_out ? formatJSTTime(card.clock_out) : "-"}
                                            </span>
                                        </div>
                                    </div>
                                    {card.clock_in && card.clock_out && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            勤務時間: {calculateWorkHours(card.clock_in, card.clock_out)}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function formatSelectedDate(dateStr: string): string {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
    const dayOfWeek = weekDays[date.getDay()];
    return `${year}年${month}月${day}日（${dayOfWeek}）`;
}

function calculateWorkHours(clockIn: string, clockOut: string): string {
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}時間${minutes}分`;
}
