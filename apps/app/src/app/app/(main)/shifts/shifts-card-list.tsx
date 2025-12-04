"use client";

import { Calendar, Users, Clock } from "lucide-react";
import type { ShiftRequestWithDates } from "./actions";

interface ShiftsCardListProps {
    requests: ShiftRequestWithDates[];
    onRequestClick: (requestId: string) => void;
}

export function ShiftsCardList({ requests, onRequestClick }: ShiftsCardListProps) {
    if (requests.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                    シフト募集がありません
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    右上の＋ボタンから新規作成できます
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {requests.map((request) => (
                <ShiftRequestCard
                    key={request.id}
                    request={request}
                    onClick={() => onRequestClick(request.id)}
                />
            ))}
        </div>
    );
}

function ShiftRequestCard({
    request,
    onClick,
}: {
    request: ShiftRequestWithDates;
    onClick: () => void;
}) {
    const dates = request.shift_request_dates || [];
    const dateRange = getDateRange(dates);
    const isOpen = request.status === "open";
    const deadline = new Date(request.deadline);
    const isOverdue = deadline < new Date() && isOpen;

    return (
        <button
            type="button"
            onClick={onClick}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-left transition-all hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600"
        >
            {/* Status Badge */}
            <div className="flex items-center justify-between mb-3">
                <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        isOpen
                            ? isOverdue
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                >
                    {isOpen ? (isOverdue ? "期限切れ" : "募集中") : "締切"}
                </span>
                {request.line_notification_sent && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                        LINE送信済み
                    </span>
                )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                {request.title}
            </h3>

            {/* Date Range */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 mb-2">
                <Calendar className="h-4 w-4" />
                <span>{dateRange}</span>
            </div>

            {/* Target Roles */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 mb-2">
                <Users className="h-4 w-4" />
                <span>
                    {request.target_roles?.map((r) => (r === "cast" ? "キャスト" : "スタッフ")).join("・") || "全員"}
                </span>
            </div>

            {/* Deadline */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                <span className={isOverdue ? "text-red-500" : ""}>
                    期限: {formatDeadline(request.deadline)}
                </span>
            </div>
        </button>
    );
}

function getDateRange(dates: { target_date: string }[]): string {
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
