"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Clock, Check, X, Loader2, Trash2, ChevronLeft } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useGlobalLoading } from "@/components/global-loading";
import {
    type GridCellData,
    getUserSubmissionForDate,
    approveSubmission,
    rejectSubmission,
    revertSubmissionToPending,
    createWorkRecord,
    updateWorkRecord,
    deleteWorkRecord,
} from "./actions";

interface ShiftCellModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    date: string;
    targetProfileId: string;
    targetProfileName: string;
    cell: GridCellData | null;
    requestDateId?: string;
    storeId: string;
    approverProfileId: string;
}

interface Submission {
    id: string;
    status: string;
    availability: string;
    preferred_start_time: string | null;
    preferred_end_time: string | null;
}

export function ShiftCellModal({
    isOpen,
    onClose,
    onSuccess,
    date,
    targetProfileId,
    targetProfileName,
    cell,
    requestDateId,
    storeId,
    approverProfileId,
}: ShiftCellModalProps) {
    const { toast } = useToast();
    const { showLoading, hideLoading } = useGlobalLoading();
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [startTime, setStartTime] = useState(cell?.startTime?.slice(0, 5) || "20:00");
    const [endTime, setEndTime] = useState(cell?.endTime?.slice(0, 5) || "01:00");
    const initialLoadRef = useRef(true);

    useEffect(() => {
        if (isOpen && requestDateId) {
            loadSubmission();
        }
    }, [isOpen, requestDateId, targetProfileId]);

    useEffect(() => {
        // cellが変わったら時間を更新
        initialLoadRef.current = true;
        if (cell?.startTime) {
            setStartTime(cell.startTime.slice(0, 5));
        }
        if (cell?.endTime) {
            setEndTime(cell.endTime.slice(0, 5));
        }
    }, [cell]);

    // 自動保存関数
    const autoSave = useCallback(async () => {
        if (!cell?.recordId) return;

        showLoading("保存中...");
        try {
            const result = await updateWorkRecord(cell.recordId, {
                scheduledStartTime: startTime,
                scheduledEndTime: endTime,
            });
            if (!result.success) {
                toast({ title: "保存に失敗しました", variant: "destructive" });
            } else {
                onSuccess?.();
            }
        } catch (error) {
            console.error("Error auto-saving:", error);
            toast({ title: "エラーが発生しました", variant: "destructive" });
        } finally {
            hideLoading();
        }
    }, [cell?.recordId, startTime, endTime, showLoading, hideLoading, toast, onSuccess]);

    // 時間変更時の自動保存（デバウンス 800ms）
    useEffect(() => {
        // 初期ロード時はスキップ
        if (initialLoadRef.current) {
            initialLoadRef.current = false;
            return;
        }

        // recordIdがない場合はスキップ
        if (!cell?.recordId) return;

        const timer = setTimeout(() => {
            autoSave();
        }, 800);

        return () => clearTimeout(timer);
    }, [startTime, endTime, autoSave, cell?.recordId]);

    const loadSubmission = async () => {
        if (!requestDateId) return;
        setIsLoading(true);
        try {
            const data = await getUserSubmissionForDate(requestDateId, targetProfileId);
            setSubmission(data);
            if (data?.preferred_start_time) {
                setStartTime(data.preferred_start_time.slice(0, 5));
            }
            if (data?.preferred_end_time) {
                setEndTime(data.preferred_end_time.slice(0, 5));
            }
        } catch (error) {
            console.error("Failed to load submission:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async () => {
        const recordId = cell?.recordId;
        if (!recordId) return;
        setIsProcessing(true);
        try {
            const result = await approveSubmission(recordId, approverProfileId, startTime, endTime);
            if (result.success) {
                toast({ title: "シフトを確定しました" });
                onSuccess?.();
                onClose();
            } else {
                toast({ title: "確定に失敗しました", variant: "destructive" });
            }
        } catch (error) {
            console.error("Error approving:", error);
            toast({ title: "エラーが発生しました", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        const recordId = cell?.recordId;
        if (!recordId) return;
        setIsProcessing(true);
        try {
            const result = await rejectSubmission(recordId, approverProfileId);
            if (result.success) {
                toast({ title: "否認しました" });
                onSuccess?.();
                onClose();
            } else {
                toast({ title: "否認に失敗しました", variant: "destructive" });
            }
        } catch (error) {
            console.error("Error rejecting:", error);
            toast({ title: "エラーが発生しました", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRevert = async () => {
        const recordId = cell?.recordId;
        if (!recordId) return;
        setIsProcessing(true);
        try {
            const result = await revertSubmissionToPending(recordId);
            if (result.success) {
                toast({ title: "提出済みに戻しました" });
                onSuccess?.();
                onClose();
            } else {
                toast({ title: "取り消しに失敗しました", variant: "destructive" });
            }
        } catch (error) {
            console.error("Error reverting:", error);
            toast({ title: "エラーが発生しました", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCreate = async () => {
        setIsProcessing(true);
        try {
            const result = await createWorkRecord({
                profileId: targetProfileId,
                storeId,
                workDate: date,
                scheduledStartTime: startTime,
                scheduledEndTime: endTime,
                approvedBy: approverProfileId,
            });
            if (result.success) {
                toast({ title: "出勤予定を追加しました" });
                onSuccess?.();
                onClose();
            } else {
                toast({ title: "追加に失敗しました", variant: "destructive" });
            }
        } catch (error) {
            console.error("Error creating:", error);
            toast({ title: "エラーが発生しました", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!cell?.recordId) return;
        setIsProcessing(true);
        try {
            const result = await deleteWorkRecord(cell.recordId);
            if (result.success) {
                toast({ title: "出勤予定を削除しました" });
                onSuccess?.();
                onClose();
            } else {
                toast({ title: "削除に失敗しました", variant: "destructive" });
            }
        } catch (error) {
            console.error("Error deleting:", error);
            toast({ title: "エラーが発生しました", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const formatDisplayDate = (dateStr: string): string => {
        const [year, month, day] = dateStr.split("-").map(Number);
        const d = new Date(year, month - 1, day);
        const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
        return `${month}月${day}日（${weekDays[d.getDay()]}）`;
    };

    const getStatusLabel = () => {
        if (cell?.status === "scheduled") return "確定済み";
        if (cell?.status === "pending") return "未確認";
        if (cell?.status === "rejected") return "否認済み";
        if (submission?.status === "pending") return "未確認";
        if (submission?.status === "approved") return "確定済み";
        if (submission?.status === "rejected") return "否認済み";
        return "未提出";
    };

    const getStatusTagClass = () => {
        if (cell?.status === "scheduled" || submission?.status === "approved") {
            return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
        }
        if (cell?.status === "pending" || submission?.status === "pending") {
            return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
        }
        if (cell?.status === "rejected" || submission?.status === "rejected") {
            return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
        }
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-sm p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {targetProfileName} - {formatDisplayDate(date)}
                    </DialogTitle>
                    {cell?.recordId ? (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isProcessing}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                            aria-label="削除"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    ) : (
                        <div className="w-8 h-8" />
                    )}
                </DialogHeader>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {/* Status */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-300">ステータス:</span>
                            <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${getStatusTagClass()}`}>
                                {getStatusLabel()}
                            </span>
                        </div>

                        {/* Time Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                時間
                            </label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="h-10 flex-1 text-base"
                                />
                                <span className="text-gray-400 text-sm">〜</span>
                                <Input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="h-10 flex-1 text-base"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 pt-2">
                            {/* 出勤予定を追加（recordIdがなく、確定済み・pending以外の場合） */}
                            {!cell?.recordId &&
                             cell?.status !== "scheduled" &&
                             cell?.status !== "pending" &&
                             submission?.status !== "approved" &&
                             submission?.status !== "pending" && (
                                <Button
                                    onClick={handleCreate}
                                    disabled={isProcessing}
                                    className="w-full"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="h-4 w-4 mr-2" />
                                            出勤予定を追加
                                        </>
                                    )}
                                </Button>
                            )}

                            {/* 未確認（pending）の場合：確定 or 否認 */}
                            {(cell?.status === "pending" || submission?.status === "pending") && (
                                <>
                                    <Button
                                        onClick={handleApprove}
                                        disabled={isProcessing || !cell?.recordId}
                                        className="w-full"
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Check className="h-4 w-4 mr-2" />
                                                確定する
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleReject}
                                        disabled={isProcessing || !cell?.recordId}
                                        className="w-full"
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <X className="h-5 w-5 mr-2" />
                                                否認する
                                            </>
                                        )}
                                    </Button>
                                </>
                            )}

                            {/* 確定済みの場合：取り消し */}
                            {(cell?.status === "scheduled" || submission?.status === "approved") && cell?.recordId && (
                                <Button
                                    variant="outline"
                                    onClick={handleRevert}
                                    disabled={isProcessing}
                                    className="w-full"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <X className="h-5 w-5 mr-2" />
                                            確定を取り消す
                                        </>
                                    )}
                                </Button>
                            )}

                            {/* 否認済みの場合：提出済みに戻す */}
                            {(cell?.status === "rejected" || submission?.status === "rejected") && cell?.recordId && (
                                <Button
                                    variant="outline"
                                    onClick={handleRevert}
                                    disabled={isProcessing}
                                    className="w-full"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        "提出済みに戻す"
                                    )}
                                </Button>
                            )}

                            {/* 閉じるボタン */}
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="w-full"
                            >
                                閉じる
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
