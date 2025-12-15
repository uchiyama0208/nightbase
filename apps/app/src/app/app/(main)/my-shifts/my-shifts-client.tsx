"use client";

import { useState, useMemo } from "react";
import { Calendar, Clock, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";

const SubmissionModal = dynamic(
    () => import("./submission-modal").then((mod) => ({ default: mod.SubmissionModal })),
    { loading: () => null, ssr: false }
);

interface ShiftRequestDate {
    id: string;
    target_date: string;
    default_start_time: string | null;
    default_end_time: string | null;
}

interface ShiftRequest {
    id: string;
    store_id: string;
    title: string;
    description: string | null;
    deadline: string;
    status: string;
    target_roles: string[];
    shift_request_dates: ShiftRequestDate[];
}

interface StoreDefaults {
    default_cast_start_time: string | null;
    default_cast_end_time: string | null;
    default_staff_start_time: string | null;
    default_staff_end_time: string | null;
}

interface ApprovedShift {
    id: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
}

interface MyShiftsClientProps {
    shiftRequests: ShiftRequest[];
    profileId: string;
    profileRole: string;
    storeDefaults: StoreDefaults | null;
    approvedShifts: ApprovedShift[];
    submittedRequestIds: string[];
}

export function MyShiftsClient({
    shiftRequests,
    profileId,
    profileRole,
    storeDefaults,
    approvedShifts,
    submittedRequestIds,
}: MyShiftsClientProps) {
    const [selectedRequest, setSelectedRequest] = useState<ShiftRequest | null>(null);
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    // 募集中のみフィルタ（締切が現在時刻より後）
    const openRequests = useMemo(() => {
        const now = new Date();
        return shiftRequests.filter((request) => {
            const deadline = new Date(request.deadline);
            return deadline > now;
        });
    }, [shiftRequests]);

    // 出勤予定日をMapに変換（date -> shift info）
    const approvedShiftMap = useMemo(() => {
        const map = new Map<string, ApprovedShift>();
        for (const shift of approvedShifts) {
            map.set(shift.date, shift);
        }
        return map;
    }, [approvedShifts]);

    // 提出済みのリクエストIDをSetに変換
    const submittedRequestIdsSet = useMemo(() => {
        return new Set(submittedRequestIds);
    }, [submittedRequestIds]);

    // カレンダーのナビゲーション
    const goToPreviousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    return (
        <div className="space-y-4">
            {/* 募集中のシフト */}
            {openRequests.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                    {openRequests.map((request) => (
                        <ShiftRequestCard
                            key={request.id}
                            request={request}
                            isSubmitted={submittedRequestIdsSet.has(request.id)}
                            onClick={() => setSelectedRequest(request)}
                        />
                    ))}
                </div>
            )}

            {/* カレンダー */}
            <ShiftCalendar
                currentMonth={currentMonth}
                approvedShiftMap={approvedShiftMap}
                onPreviousMonth={goToPreviousMonth}
                onNextMonth={goToNextMonth}
            />

            {selectedRequest && (
                <SubmissionModal
                    isOpen={selectedRequest !== null}
                    onClose={() => setSelectedRequest(null)}
                    request={selectedRequest}
                    profileId={profileId}
                    profileRole={profileRole}
                    storeDefaults={storeDefaults}
                />
            )}
        </div>
    );
}

function ShiftRequestCard({
    request,
    isSubmitted,
    onClick,
}: {
    request: ShiftRequest;
    isSubmitted: boolean;
    onClick: () => void;
}) {
    const dates = request.shift_request_dates || [];
    const dateRange = getDateRange(dates);
    const deadline = new Date(request.deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const getDeadlineBadge = () => {
        // 提出済みの場合は提出済みタグを表示
        if (isSubmitted) {
            return (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    提出済み
                </span>
            );
        }
        if (daysUntilDeadline <= 1) {
            return (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    締切間近
                </span>
            );
        }
        if (daysUntilDeadline <= 3) {
            return (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    あと{daysUntilDeadline}日
                </span>
            );
        }
        return (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                募集中
            </span>
        );
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-left transition-all hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600"
        >
            {/* Deadline Badge + Date Range */}
            <div className="flex items-center gap-2 mb-3">
                {getDeadlineBadge()}
                <span className="font-semibold text-gray-900 dark:text-white">
                    {dateRange}
                </span>
            </div>

            {/* Description */}
            {request.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                    {request.description}
                </p>
            )}

            {/* Deadline */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                <span>
                    期限: {formatDeadline(request.deadline)}
                </span>
            </div>
        </button>
    );
}

function ShiftCalendar({
    currentMonth,
    approvedShiftMap,
    onPreviousMonth,
    onNextMonth,
}: {
    currentMonth: Date;
    approvedShiftMap: Map<string, ApprovedShift>;
    onPreviousMonth: () => void;
    onNextMonth: () => void;
}) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

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

    const goToToday = () => {
        // This would need state management to work properly
        // For now, we'll just use the month navigation
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Calendar Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <button
                    type="button"
                    onClick={onPreviousMonth}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        {year}年{month + 1}月
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={onNextMonth}
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
                                className="min-h-[56px] border-b border-r border-gray-100 dark:border-gray-800 last:border-r-0"
                            />
                        );
                    }

                    const dateKey = formatDateKey(day);
                    const shift = approvedShiftMap.get(dateKey);
                    const dayOfWeek = (startingDayOfWeek + day - 1) % 7;
                    const isSunday = dayOfWeek === 0;
                    const isSaturday = dayOfWeek === 6;

                    return (
                        <div
                            key={dateKey}
                            className={`min-h-[56px] p-1 border-b border-r border-gray-100 dark:border-gray-800 last:border-r-0 ${
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

                            {/* Shift Time */}
                            {shift && (
                                <div className="flex items-center gap-0.5 text-[10px] leading-tight px-1 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                    <Clock className="h-2.5 w-2.5" />
                                    <span className="truncate">{formatTimeRange(shift.startTime, shift.endTime)}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30" />
                    <span>出勤予定</span>
                </div>
            </div>
        </div>
    );
}

function getDateRange(dates: ShiftRequestDate[]): string {
    if (dates.length === 0) return "日付なし";
    if (dates.length === 1) return formatDate(dates[0].target_date);

    const sorted = [...dates].sort((a, b) => a.target_date.localeCompare(b.target_date));
    const first = sorted[0].target_date;
    const last = sorted[sorted.length - 1].target_date;

    return `${formatDate(first)} 〜 ${formatDate(last)}（${dates.length}日間）`;
}

function formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split("-").map(Number);
    return `${month}/${day}`;
}

function formatDeadline(deadline: string): string {
    const date = new Date(deadline);
    return date.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatTimeRange(startTime: string | null, endTime: string | null): string {
    if (!startTime && !endTime) return "時間未定";

    const formatTime = (time: string | null) => {
        if (!time) return "";
        // HH:mm:ss or HH:mm format
        const parts = time.split(":");
        return `${parts[0]}:${parts[1]}`;
    };

    if (startTime && endTime) {
        return `${formatTime(startTime)}-${formatTime(endTime)}`;
    }
    if (startTime) {
        return `${formatTime(startTime)}〜`;
    }
    return `〜${formatTime(endTime)}`;
}
