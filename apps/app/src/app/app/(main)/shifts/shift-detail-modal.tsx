"use client";

import { useState, useEffect } from "react";
import { Users, Clock, Check, X, Loader2 } from "lucide-react";
import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getDateSubmissions, approveSubmission, rejectSubmission, approveAllSubmissions } from "./actions";
import type { ShiftSubmission } from "./actions";

interface ShiftDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: string;
    requestDateId?: string;
    storeId: string;
    profileId: string;
}

export function ShiftDetailModal({
    isOpen,
    onClose,
    date,
    requestDateId,
    storeId,
    profileId,
}: ShiftDetailModalProps) {
    const [submissions, setSubmissions] = useState<ShiftSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && requestDateId) {
            loadSubmissions();
        } else {
            setSubmissions([]);
            setIsLoading(false);
        }
    }, [isOpen, requestDateId]);

    const loadSubmissions = async () => {
        if (!requestDateId) return;
        setIsLoading(true);
        try {
            const data = await getDateSubmissions(requestDateId);
            setSubmissions(data);
        } catch (error) {
            console.error("Failed to load submissions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (submissionId: string) => {
        setProcessingId(submissionId);
        try {
            const result = await approveSubmission(submissionId, profileId);
            if (result.success) {
                setSubmissions((prev) =>
                    prev.map((s) =>
                        s.id === submissionId ? { ...s, status: "approved" as const } : s
                    )
                );
            }
        } catch (error) {
            console.error("Failed to approve:", error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (submissionId: string) => {
        setProcessingId(submissionId);
        try {
            const result = await rejectSubmission(submissionId, profileId);
            if (result.success) {
                setSubmissions((prev) =>
                    prev.map((s) =>
                        s.id === submissionId ? { ...s, status: "rejected" as const } : s
                    )
                );
            }
        } catch (error) {
            console.error("Failed to reject:", error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleApproveAll = async () => {
        if (!requestDateId) return;
        setProcessingId("all");
        try {
            const result = await approveAllSubmissions(requestDateId, profileId);
            if (result.success) {
                setSubmissions((prev) =>
                    prev.map((s) =>
                        s.status === "pending" && s.availability === "available"
                            ? { ...s, status: "approved" as const }
                            : s
                    )
                );
            }
        } catch (error) {
            console.error("Failed to approve all:", error);
        } finally {
            setProcessingId(null);
        }
    };

    const formattedDate = formatDisplayDate(date);
    const availableSubmissions = submissions.filter((s) => s.availability === "available");
    const unavailableSubmissions = submissions.filter((s) => s.availability === "unavailable");
    const pendingCount = availableSubmissions.filter((s) => s.status === "pending").length;
    const approvedCount = availableSubmissions.filter((s) => s.status === "approved").length;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                <DialogHeader className="border-b px-4 py-3 flex-shrink-0 mb-0">
                    <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formattedDate}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : !requestDateId ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            この日にはシフト募集がありません
                        </div>
                    ) : submissions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            まだ提出がありません
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary */}
                            <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        出勤希望: {availableSubmissions.length}名
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        確定: {approvedCount}名
                                    </span>
                                </div>
                            </div>

                            {/* Approve All Button */}
                            {pendingCount > 0 && (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleApproveAll}
                                    disabled={processingId !== null}
                                >
                                    {processingId === "all" ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4 mr-2" />
                                    )}
                                    出勤希望を一括承認（{pendingCount}名）
                                </Button>
                            )}

                            {/* Available Submissions */}
                            {availableSubmissions.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        出勤希望
                                    </h3>
                                    <div className="space-y-2">
                                        {availableSubmissions.map((submission) => (
                                            <SubmissionItem
                                                key={submission.id}
                                                submission={submission}
                                                onApprove={handleApprove}
                                                onReject={handleReject}
                                                isProcessing={processingId === submission.id}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Unavailable Submissions */}
                            {unavailableSubmissions.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                        出勤不可
                                    </h3>
                                    <div className="space-y-2">
                                        {unavailableSubmissions.map((submission) => (
                                            <div
                                                key={submission.id}
                                                className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                                            >
                                                {submission.profiles?.avatar_url ? (
                                                    <Image
                                                        src={submission.profiles.avatar_url}
                                                        alt=""
                                                        width={32}
                                                        height={32}
                                                        className="h-8 w-8 rounded-full object-cover opacity-50"
                                                    />
                                                ) : (
                                                    <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 opacity-50" />
                                                )}
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    {submission.profiles?.display_name || "名前なし"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="border-t px-4 py-3 flex justify-end flex-shrink-0">
                    <Button variant="outline" onClick={onClose}>
                        閉じる
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function SubmissionItem({
    submission,
    onApprove,
    onReject,
    isProcessing,
}: {
    submission: ShiftSubmission;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    isProcessing: boolean;
}) {
    const profile = submission.profiles;
    const isPending = submission.status === "pending";
    const isApproved = submission.status === "approved";
    const isRejected = submission.status === "rejected";

    return (
        <div
            className={`flex items-center gap-3 p-3 rounded-xl ${
                isApproved
                    ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                    : isRejected
                    ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                    : "bg-gray-50 dark:bg-gray-800"
            }`}
        >
            {profile?.avatar_url ? (
                <Image
                    src={profile.avatar_url}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                />
            ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
            )}

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {profile?.display_name || "名前なし"}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>
                        {submission.preferred_start_time?.slice(0, 5) || "--:--"} 〜{" "}
                        {submission.preferred_end_time?.slice(0, 5) || "--:--"}
                    </span>
                </div>
            </div>

            {isPending && (
                <div className="flex items-center gap-1">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
                        onClick={() => onApprove(submission.id)}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Check className="h-4 w-4" />
                        )}
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                        onClick={() => onReject(submission.id)}
                        disabled={isProcessing}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {isApproved && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                    確定
                </span>
            )}

            {isRejected && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                    却下
                </span>
            )}
        </div>
    );
}

function formatDisplayDate(dateStr: string): string {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
    return `${year}年${month}月${day}日（${weekDays[date.getDay()]}）`;
}
