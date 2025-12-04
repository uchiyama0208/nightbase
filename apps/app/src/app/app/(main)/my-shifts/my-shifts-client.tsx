"use client";

import { useState } from "react";
import { Calendar, Clock, Check, AlertCircle } from "lucide-react";
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

interface MyShiftsClientProps {
    shiftRequests: ShiftRequest[];
    profileId: string;
    profileRole: string;
    storeDefaults: StoreDefaults | null;
}

export function MyShiftsClient({
    shiftRequests,
    profileId,
    profileRole,
    storeDefaults,
}: MyShiftsClientProps) {
    const [selectedRequest, setSelectedRequest] = useState<ShiftRequest | null>(null);

    if (shiftRequests.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                    現在募集中のシフトはありません
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shiftRequests.map((request) => (
                    <ShiftRequestCard
                        key={request.id}
                        request={request}
                        onClick={() => setSelectedRequest(request)}
                    />
                ))}
            </div>

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
        </>
    );
}

function ShiftRequestCard({
    request,
    onClick,
}: {
    request: ShiftRequest;
    onClick: () => void;
}) {
    const dates = request.shift_request_dates || [];
    const dateRange = getDateRange(dates);
    const deadline = new Date(request.deadline);
    const now = new Date();
    const isOverdue = deadline < now;
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isOverdue}
            className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-left transition-all hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 ${
                isOverdue ? "opacity-60 cursor-not-allowed" : ""
            }`}
        >
            {/* Urgency Badge */}
            <div className="flex items-center justify-between mb-3">
                {isOverdue ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        期限切れ
                    </span>
                ) : daysUntilDeadline <= 1 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        締切間近
                    </span>
                ) : daysUntilDeadline <= 3 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        あと{daysUntilDeadline}日
                    </span>
                ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        募集中
                    </span>
                )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                {request.title}
            </h3>

            {/* Description */}
            {request.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                    {request.description}
                </p>
            )}

            {/* Date Range */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 mb-2">
                <Calendar className="h-4 w-4" />
                <span>{dateRange}</span>
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
