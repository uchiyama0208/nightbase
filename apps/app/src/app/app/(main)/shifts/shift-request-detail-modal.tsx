"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, Users, Loader2, Trash2, ChevronRight, ChevronLeft } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { closeShiftRequest, deleteShiftRequest, getRequestDateCounts } from "./actions";

interface ShiftRequestDate {
    id: string;
    target_date: string;
    default_start_time: string | null;
    default_end_time: string | null;
}

interface ShiftRequest {
    id: string;
    title: string;
    description: string | null;
    deadline: string;
    target_roles: string[] | null;
    status: string;
    shift_request_dates: ShiftRequestDate[];
    line_notification_sent?: boolean;
}

interface ShiftRequestDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: ShiftRequest;
    onDateClick?: (date: string, requestDateId: string) => void;
}

export function ShiftRequestDetailModal({
    isOpen,
    onClose,
    request,
    onDateClick,
}: ShiftRequestDetailModalProps) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [isClosing, setIsClosing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [dateCounts, setDateCounts] = useState<{
        [dateId: string]: {
            pendingCount: number;
            notSubmittedCount: number;
            confirmedCount: number;
        };
    }>({});
    const [isLoadingCounts, setIsLoadingCounts] = useState(false);

    const dates = request.shift_request_dates || [];

    // 日付カウントを取得
    useEffect(() => {
        if (isOpen && dates.length > 0) {
            setIsLoadingCounts(true);
            const dateIds = dates.map((d) => d.id);
            getRequestDateCounts(dateIds)
                .then((counts) => setDateCounts(counts))
                .catch(console.error)
                .finally(() => setIsLoadingCounts(false));
        }
    }, [isOpen, dates]);
    const sortedDates = [...dates].sort((a, b) =>
        a.target_date.localeCompare(b.target_date)
    );

    const deadline = new Date(request.deadline);
    const deadlineStr = deadline.toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    const targetRolesText = request.target_roles?.map(r =>
        r === "cast" ? "キャスト" : r === "staff" ? "スタッフ" : r
    ).join("・") || "全員";

    const handleClose = async () => {
        setIsClosing(true);
        try {
            const result = await closeShiftRequest(request.id);
            if (result.success) {
                toast({ title: "募集を締め切りました" });
                await queryClient.invalidateQueries({ queryKey: ["shifts"] });
                onClose();
            } else {
                toast({ title: "エラーが発生しました", variant: "destructive" });
            }
        } catch {
            toast({ title: "エラーが発生しました", variant: "destructive" });
        } finally {
            setIsClosing(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteShiftRequest(request.id);
            if (result.success) {
                toast({ title: "募集を削除しました" });
                await queryClient.invalidateQueries({ queryKey: ["shifts"] });
                onClose();
            } else {
                toast({ title: "エラーが発生しました", variant: "destructive" });
            }
        } catch {
            toast({ title: "エラーが発生しました", variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split("-").map(Number);
        const date = new Date(year, month - 1, day);
        const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
        return `${month}/${day}（${weekDays[date.getDay()]}）`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {request.title || "シフト募集"}
                    </DialogTitle>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                    >
                        {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                    </button>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Info */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Users className="h-4 w-4" />
                            <span>対象: {targetRolesText}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="h-5 w-5" />
                            <span>締切: {deadlineStr}</span>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            対象日
                        </p>
                        <div className="space-y-2">
                            {isLoadingCounts ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                </div>
                            ) : (
                                sortedDates.map((d) => {
                                    const counts = dateCounts[d.id];
                                    return (
                                        <button
                                            key={d.id}
                                            type="button"
                                            onClick={() => onDateClick?.(d.target_date, d.id)}
                                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
                                        >
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                {formatDate(d.target_date)}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                {counts?.pendingCount > 0 && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                        未確認 {counts.pendingCount}
                                                    </span>
                                                )}
                                                {counts?.notSubmittedCount > 0 && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                                        未提出 {counts.notSubmittedCount}
                                                    </span>
                                                )}
                                                <ChevronRight className="h-4 w-4 text-gray-400" />
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    {request.description && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                説明
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {request.description}
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="border-t px-4 py-4 space-y-2 flex-shrink-0">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isClosing}
                        className="w-full"
                    >
                        {isClosing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            "募集を締め切る"
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="w-full"
                    >
                        閉じる
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
