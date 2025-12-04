"use client";

import { useState, useEffect } from "react";
import { Users, Check, X, Clock, Loader2, Calendar, ChevronLeft, MoreVertical } from "lucide-react";
import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { getSubmissionStatus, closeShiftRequest, deleteShiftRequest } from "./actions";
import { useRouter } from "next/navigation";

interface SubmissionStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    requestId: string;
    profileId: string;
}

interface SubmissionData {
    request: any;
    profiles: any[];
    submissions: any[];
}

export function SubmissionStatusModal({
    isOpen,
    onClose,
    requestId,
    profileId,
}: SubmissionStatusModalProps) {
    const router = useRouter();
    const [data, setData] = useState<SubmissionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isClosing, setIsClosing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (isOpen && requestId) {
            loadData();
        }
    }, [isOpen, requestId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const result = await getSubmissionStatus(requestId);
            setData(result);
        } catch (error) {
            console.error("Failed to load submission status:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = async () => {
        setIsClosing(true);
        try {
            const result = await closeShiftRequest(requestId);
            if (result.success) {
                router.refresh();
                onClose();
            }
        } catch (error) {
            console.error("Failed to close request:", error);
        } finally {
            setIsClosing(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteShiftRequest(requestId);
            if (result.success) {
                router.refresh();
                onClose();
            }
        } catch (error) {
            console.error("Failed to delete request:", error);
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    if (!data) {
        return (
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-md">
                    <DialogHeader className="sr-only">
                        <DialogTitle>読み込み中</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    const { request, profiles, submissions } = data;
    const dates = request.shift_request_dates || [];

    // 提出状況を計算
    const submittedProfileIds = new Set(submissions.map((s: any) => s.profile_id));
    const targetProfiles = profiles;
    const submittedCount = targetProfiles.filter((p: any) => submittedProfileIds.has(p.id)).length;
    const notSubmittedProfiles = targetProfiles.filter((p: any) => !submittedProfileIds.has(p.id));

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                <DialogHeader className="border-b px-4 py-3 flex-shrink-0 mb-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                                {request.title}
                            </DialogTitle>
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <MoreVertical className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-40 p-1">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                >
                                    削除
                                </button>
                            </PopoverContent>
                        </Popover>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Status Badge */}
                            <div className="flex items-center gap-2">
                                <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        request.status === "open"
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                    }`}
                                >
                                    {request.status === "open" ? "募集中" : "締切"}
                                </span>
                                {request.line_notification_sent && (
                                    <span className="text-xs text-gray-500">LINE送信済み</span>
                                )}
                            </div>

                            {/* Date Range */}
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Calendar className="h-4 w-4" />
                                <span>
                                    {dates.length > 0
                                        ? `${formatDate(dates[0].target_date)} 〜 ${formatDate(dates[dates.length - 1].target_date)}（${dates.length}日間）`
                                        : "日付なし"}
                                </span>
                            </div>

                            {/* Deadline */}
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Clock className="h-4 w-4" />
                                <span>
                                    期限: {new Date(request.deadline).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                                </span>
                            </div>

                            {/* Submission Summary */}
                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            提出状況
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {submittedCount}
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400">
                                            /{targetProfiles.length}名
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all"
                                        style={{
                                            width: `${(submittedCount / targetProfiles.length) * 100}%`,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Not Submitted List */}
                            {notSubmittedProfiles.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        未提出（{notSubmittedProfiles.length}名）
                                    </h3>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                        {notSubmittedProfiles.map((profile: any) => (
                                            <div
                                                key={profile.id}
                                                className="flex items-center gap-3 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/10"
                                            >
                                                {profile.avatar_url ? (
                                                    <Image
                                                        src={profile.avatar_url}
                                                        alt=""
                                                        width={32}
                                                        height={32}
                                                        className="h-8 w-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                                                )}
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {profile.display_name || "名前なし"}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {profile.role === "cast" ? "キャスト" : "スタッフ"}
                                                        {!profile.line_user_id && " (LINE未連携)"}
                                                    </p>
                                                </div>
                                                <X className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Submitted List */}
                            {submittedCount > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        提出済み（{submittedCount}名）
                                    </h3>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                        {targetProfiles
                                            .filter((p: any) => submittedProfileIds.has(p.id))
                                            .map((profile: any) => (
                                                <div
                                                    key={profile.id}
                                                    className="flex items-center gap-3 p-2 rounded-lg bg-green-50 dark:bg-green-900/10"
                                                >
                                                    {profile.avatar_url ? (
                                                        <Image
                                                            src={profile.avatar_url}
                                                            alt=""
                                                            width={32}
                                                            height={32}
                                                            className="h-8 w-8 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                                                    )}
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                                                        {profile.display_name || "名前なし"}
                                                    </p>
                                                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {request.status === "open" && (
                    <div className="border-t px-4 py-3 flex-shrink-0">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleClose}
                            disabled={isClosing}
                        >
                            {isClosing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            募集を締め切る
                        </Button>
                    </div>
                )}

                {/* Delete Confirmation */}
                {showDeleteConfirm && (
                    <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                        <DialogContent className="max-w-sm">
                            <DialogHeader>
                                <DialogTitle className="text-gray-900 dark:text-white">
                                    募集を削除しますか？
                                </DialogTitle>
                            </DialogHeader>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                この操作は取り消せません。関連する提出データもすべて削除されます。
                            </p>
                            <div className="flex justify-end gap-2 mt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDeleteConfirm(false)}
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : null}
                                    削除する
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </DialogContent>
        </Dialog>
    );
}

function formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split("-").map(Number);
    return `${month}/${day}`;
}
