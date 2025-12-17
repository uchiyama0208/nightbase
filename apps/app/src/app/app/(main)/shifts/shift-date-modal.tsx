"use client";

import { useState, useMemo, useEffect } from "react";
import { Users, Clock, Check, X, Loader2, Send, ChevronLeft, ChevronRight, Plus, UserPlus } from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { approveSubmission, rejectSubmission, revertSubmissionToPending, getDateSubmissions, createWorkRecord } from "./actions";

const UserEditModal = dynamic(
    () => import("../users/user-edit-modal").then((mod) => ({ default: mod.UserEditModal })),
    { loading: () => null, ssr: false }
);
const LineWarningModal = dynamic(
    () => import("./line-warning-modal").then((mod) => ({ default: mod.LineWarningModal })),
    { loading: () => null, ssr: false }
);

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
        display_name_kana: string | null;
        avatar_url: string | null;
        role: string;
        line_is_friend?: boolean;
    } | null;
}

type FilterType = "confirmed" | "submitted" | "not_submitted" | "rejected";

interface PagePermissions {
    bottles: boolean;
    resumes: boolean;
    salarySystems: boolean;
    attendance: boolean;
    personalInfo: boolean;
}

interface ShiftDateModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: string;
    requestDateId?: string;
    profileId: string;
    storeId: string;
    storeName: string;
    onNavigate?: (direction: "prev" | "next") => void;
    pagePermissions?: PagePermissions;
}

export function ShiftDateModal({
    isOpen,
    onClose,
    date,
    requestDateId,
    profileId,
    storeId,
    storeName,
    onNavigate,
    pagePermissions,
}: ShiftDateModalProps) {
    const { toast } = useToast();
    const [submissions, setSubmissions] = useState<ShiftSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [roleTab, setRoleTab] = useState<"cast" | "staff">("cast");
    const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(new Set(["confirmed"]));
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isSendingReminder, setIsSendingReminder] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<any>(null);
    const [showLineWarningModal, setShowLineWarningModal] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        if (isOpen && requestDateId) {
            loadSubmissions();
        } else {
            setSubmissions([]);
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
            setSubmissions([]);
        } finally {
            setIsLoading(false);
        }
    };

    const selectFilter = (filter: FilterType) => {
        setActiveFilters(new Set([filter]));
    };

    const handleApprove = async (submissionId: string, startTime: string, endTime: string) => {
        setProcessingId(submissionId);
        try {
            const result = await approveSubmission(submissionId, profileId, startTime, endTime);
            if (result.success) {
                toast({ title: "シフトを確定しました" });
                await loadSubmissions();
            } else {
                toast({ title: "確定に失敗しました", variant: "destructive" });
            }
        } catch (error) {
            console.error("Error approving:", error);
            toast({ title: "エラーが発生しました", variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (submissionId: string) => {
        setProcessingId(submissionId);
        try {
            const result = await rejectSubmission(submissionId, profileId);
            if (result.success) {
                toast({ title: "否認しました" });
                await loadSubmissions();
            } else {
                toast({ title: "否認に失敗しました", variant: "destructive" });
            }
        } catch (error) {
            console.error("Error rejecting:", error);
            toast({ title: "エラーが発生しました", variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    const handleRevert = async (submissionId: string) => {
        setProcessingId(submissionId);
        try {
            const result = await revertSubmissionToPending(submissionId);
            if (result.success) {
                toast({ title: "提出済みに戻しました" });
                await loadSubmissions();
            } else {
                toast({ title: "取り消しに失敗しました", variant: "destructive" });
            }
        } catch (error) {
            console.error("Error reverting:", error);
            toast({ title: "エラーが発生しました", variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    // LINE未連携のユーザーがいるかチェックして警告モーダルを表示するか実際に送信するか決定
    const handleSendReminderClick = () => {
        const notSubmittedUsers = currentRoleSubmissions.filter(
            (s) => s.status === "not_submitted" || !s.status
        );
        const unlinkedUsers = notSubmittedUsers.filter((s) => s.profiles?.line_is_friend !== true);

        if (unlinkedUsers.length > 0) {
            setShowLineWarningModal(true);
        } else {
            handleSendReminder();
        }
    };

    const handleSendReminder = async () => {
        if (!requestDateId || !date) return;
        setIsSendingReminder(true);
        setShowLineWarningModal(false);
        try {
            const response = await fetch("/api/shifts/reminder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requestDateId: requestDateId,
                    targetDate: date,
                    storeName: storeName,
                }),
            });
            const result = await response.json();
            if (result.success) {
                toast({ title: `${result.sentCount}名にリマインダーを送信しました` });
            } else {
                toast({ title: result.error || "送信に失敗しました", variant: "destructive" });
            }
        } catch (error) {
            console.error("Error sending reminder:", error);
            toast({ title: "エラーが発生しました", variant: "destructive" });
        } finally {
            setIsSendingReminder(false);
        }
    };

    // モーダル内のフィルタリング
    const filteredSubmissions = useMemo(() => {
        return submissions.filter((s) => {
            const role = s.profiles?.role;
            const matchesRole = roleTab === "cast"
                ? role === "cast"
                : role === "staff" || role === "admin";
            if (!matchesRole) return false;

            if (activeFilters.has("confirmed")) {
                return s.status === "approved" && s.availability === "available";
            }
            if (activeFilters.has("submitted")) {
                return s.status === "pending";
            }
            if (activeFilters.has("not_submitted")) {
                return s.status === "not_submitted" || !s.status;
            }
            if (activeFilters.has("rejected")) {
                return s.status === "rejected";
            }
            return false;
        });
    }, [submissions, roleTab, activeFilters]);

    // フィルター用の人数カウント（現在選択中のロールでフィルタリング）
    const currentRoleSubmissions = submissions.filter((s) => {
        const role = s.profiles?.role;
        if (roleTab === "cast") return role === "cast";
        return role === "staff" || role === "admin";
    });

    const confirmedCount = currentRoleSubmissions.filter(
        (s) => s.status === "approved" && s.availability === "available"
    ).length;
    const submittedCount = currentRoleSubmissions.filter(
        (s) => s.status === "pending"
    ).length;
    const notSubmittedCount = currentRoleSubmissions.filter(
        (s) => s.status === "not_submitted" || !s.status
    ).length;
    const rejectedCount = currentRoleSubmissions.filter(
        (s) => s.status === "rejected"
    ).length;

    // 各ロールごとの未確認・未提出カウント（タブ表示用）
    const castSubmissions = submissions.filter((s) => s.profiles?.role === "cast");
    const staffSubmissions = submissions.filter((s) => s.profiles?.role === "staff" || s.profiles?.role === "admin");

    const castPendingCount = castSubmissions.filter((s) => s.status === "pending").length;
    const castNotSubmittedCount = castSubmissions.filter((s) => s.status === "not_submitted" || !s.status).length;
    const staffPendingCount = staffSubmissions.filter((s) => s.status === "pending").length;
    const staffNotSubmittedCount = staffSubmissions.filter((s) => s.status === "not_submitted" || !s.status).length;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                    <DialogHeader className="border-b px-4 py-3 flex-shrink-0 mb-0">
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => onNavigate?.("prev")}
                                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formatDisplayDateFull(date)}
                            </DialogTitle>
                            <button
                                type="button"
                                onClick={() => onNavigate?.("next")}
                                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>
                    </DialogHeader>

                    {/* Role Tabs with Status Indicators */}
                    <div className="relative flex-shrink-0">
                        <div className="flex">
                            <button
                                type="button"
                                onClick={() => setRoleTab("cast")}
                                className={`flex-1 py-2.5 text-sm font-medium transition-colors relative flex items-center justify-center gap-1.5 ${
                                    roleTab === "cast"
                                        ? "text-gray-900 dark:text-white"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                            >
                                キャスト
                                {(castPendingCount > 0 || castNotSubmittedCount > 0) && (
                                    <span className="flex items-center gap-1">
                                        {castPendingCount > 0 && (
                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                        )}
                                        {castNotSubmittedCount > 0 && (
                                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                                        )}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setRoleTab("staff")}
                                className={`flex-1 py-2.5 text-sm font-medium transition-colors relative flex items-center justify-center gap-1.5 ${
                                    roleTab === "staff"
                                        ? "text-gray-900 dark:text-white"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                            >
                                スタッフ
                                {(staffPendingCount > 0 || staffNotSubmittedCount > 0) && (
                                    <span className="flex items-center gap-1">
                                        {staffPendingCount > 0 && (
                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                        )}
                                        {staffNotSubmittedCount > 0 && (
                                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                                        )}
                                    </span>
                                )}
                            </button>
                        </div>
                        <div
                            className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-200"
                            style={{
                                width: "50%",
                                left: roleTab === "cast" ? "0%" : "50%"
                            }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
                    </div>

                    {/* Filter Tags */}
                    <div className="flex flex-wrap gap-2 px-4 py-3">
                        <button
                            type="button"
                            onClick={() => selectFilter("confirmed")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                                activeFilters.has("confirmed")
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                            }`}
                        >
                            確定（{confirmedCount}）
                        </button>
                        <button
                            type="button"
                            onClick={() => selectFilter("submitted")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                                activeFilters.has("submitted")
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                            }`}
                        >
                            提出済み（{submittedCount}）
                        </button>
                        <button
                            type="button"
                            onClick={() => selectFilter("not_submitted")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                                activeFilters.has("not_submitted")
                                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                            }`}
                        >
                            未提出（{notSubmittedCount}）
                        </button>
                        <button
                            type="button"
                            onClick={() => selectFilter("rejected")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                                activeFilters.has("rejected")
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                            }`}
                        >
                            否認（{rejectedCount}）
                        </button>
                    </div>

                    {/* Submissions List */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin h-8 w-8 border-2 border-gray-300 dark:border-gray-600 border-t-blue-600 rounded-full" />
                            </div>
                        ) : !requestDateId ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                この日にはシフト募集がありません
                            </div>
                        ) : filteredSubmissions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                {activeFilters.has("confirmed") && "確定済みの出勤はありません"}
                                {activeFilters.has("submitted") && "提出済みの希望はありません"}
                                {activeFilters.has("not_submitted") && "未提出のメンバーはいません"}
                                {activeFilters.has("rejected") && "否認されたメンバーはいません"}
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredSubmissions.map((submission) => (
                                    <SubmissionItem
                                        key={submission.id}
                                        submission={submission}
                                        isPending={activeFilters.has("submitted")}
                                        isConfirmed={activeFilters.has("confirmed")}
                                        isNotSubmitted={activeFilters.has("not_submitted")}
                                        isRejected={activeFilters.has("rejected")}
                                        isProcessing={processingId === submission.id}
                                        onApprove={handleApprove}
                                        onReject={handleReject}
                                        onRevert={handleRevert}
                                        onProfileClick={(profile) => setSelectedProfile(profile)}
                                        onSendReminder={async (profileIdToNotify) => {
                                            if (!requestDateId || !date) return;
                                            try {
                                                const response = await fetch("/api/shifts/reminder", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                        requestDateId: requestDateId,
                                                        targetDate: date,
                                                        storeName: storeName,
                                                        profileId: profileIdToNotify,
                                                    }),
                                                });
                                                const result = await response.json();
                                                if (result.success) {
                                                    toast({ title: "リマインダーを送信しました" });
                                                } else {
                                                    toast({ title: result.error || "送信に失敗しました", variant: "destructive" });
                                                }
                                            } catch (error) {
                                                console.error("Error sending reminder:", error);
                                                toast({ title: "エラーが発生しました", variant: "destructive" });
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        {/* Reminder Button for Not Submitted */}
                        {activeFilters.has("not_submitted") && notSubmittedCount > 0 && (
                            <Button
                                size="sm"
                                className="w-full gap-2 bg-[#06C755] hover:bg-[#05b34d] text-white"
                                onClick={handleSendReminderClick}
                                disabled={isSendingReminder}
                            >
                                {isSendingReminder ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                まとめてLINE再通知
                            </Button>
                        )}
                        {/* Add Work Record Button - 確定タグがアクティブな時のみ表示 */}
                        {activeFilters.has("confirmed") && (
                            <Button
                                size="sm"
                                className="w-full gap-2"
                                onClick={() => setIsAddModalOpen(true)}
                            >
                                <UserPlus className="h-4 w-4" />
                                出勤予定を追加
                            </Button>
                        )}
                        {/* Close Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={onClose}
                        >
                            閉じる
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* User Profile Modal */}
            {selectedProfile && (
                <UserEditModal
                    profile={selectedProfile}
                    open={selectedProfile !== null}
                    onOpenChange={(open) => !open && setSelectedProfile(null)}
                    isNested
                    hidePersonalInfo={!pagePermissions?.personalInfo}
                    pagePermissions={pagePermissions}
                />
            )}

            {/* LINE Warning Modal */}
            {showLineWarningModal && (
                <LineWarningModal
                    isOpen={showLineWarningModal}
                    onClose={() => setShowLineWarningModal(false)}
                    onConfirm={handleSendReminder}
                    unlinkedProfiles={currentRoleSubmissions
                        .filter((s) => (s.status === "not_submitted" || !s.status) && s.profiles?.line_is_friend !== true)
                        .map((s) => ({
                            id: s.profiles?.id || s.profile_id,
                            display_name: s.profiles?.display_name || null,
                            avatar_url: s.profiles?.avatar_url || null,
                            role: s.profiles?.role || "staff",
                            line_user_id: null,
                        }))}
                    linkedCount={currentRoleSubmissions
                        .filter((s) => (s.status === "not_submitted" || !s.status) && s.profiles?.line_is_friend === true)
                        .length}
                    isLoading={isSendingReminder}
                />
            )}

            {/* Add User Modal */}
            {isAddModalOpen && (
                <AddUserModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    submissions={submissions}
                    roleTab={roleTab}
                    storeId={storeId}
                    workDate={date}
                    profileId={profileId}
                    onAdded={async () => {
                        await loadSubmissions();
                        setIsAddModalOpen(false);
                        toast({ title: "出勤予定を追加しました" });
                    }}
                />
            )}
        </>
    );
}

function SubmissionItem({
    submission,
    isPending,
    isConfirmed,
    isNotSubmitted,
    isRejected,
    isProcessing,
    onApprove,
    onReject,
    onRevert,
    onProfileClick,
    onSendReminder,
}: {
    submission: ShiftSubmission;
    isPending: boolean;
    isConfirmed: boolean;
    isNotSubmitted: boolean;
    isRejected: boolean;
    isProcessing: boolean;
    onApprove: (id: string, startTime: string, endTime: string) => void;
    onReject: (id: string) => void;
    onRevert: (id: string) => void;
    onProfileClick: (profile: any) => void;
    onSendReminder: (profileId: string) => Promise<void>;
}) {
    const [startTime, setStartTime] = useState(submission.preferred_start_time?.slice(0, 5) || "20:00");
    const [endTime, setEndTime] = useState(submission.preferred_end_time?.slice(0, 5) || "01:00");
    const [isSending, setIsSending] = useState(false);

    const handleAvatarClick = () => {
        if (submission.profiles) {
            onProfileClick({
                id: submission.profiles.id,
                display_name: submission.profiles.display_name,
                avatar_url: submission.profiles.avatar_url,
                role: submission.profiles.role,
                store_id: "",
            });
        }
    };

    const handleSendReminder = async () => {
        setIsSending(true);
        try {
            await onSendReminder(submission.profile_id);
        } finally {
            setIsSending(false);
        }
    };

    if (isPending) {
        return (
            <div className="px-4 py-2">
                <div className="flex items-center gap-2">
                    {submission.profiles?.avatar_url ? (
                        <button type="button" onClick={handleAvatarClick} className="flex-shrink-0">
                            <Image
                                src={submission.profiles.avatar_url}
                                alt=""
                                width={28}
                                height={28}
                                className="h-7 w-7 rounded-full object-cover"
                            />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleAvatarClick}
                            className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0"
                        >
                            {submission.profiles?.display_name?.charAt(0) || "?"}
                        </button>
                    )}
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                        {submission.profiles?.display_name || "名前なし"}
                    </p>
                    <div className="flex gap-1">
                        <button
                            type="button"
                            onClick={() => onApprove(submission.id, startTime, endTime)}
                            disabled={isProcessing}
                            className="h-7 w-7 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => onReject(submission.id)}
                            disabled={isProcessing}
                            className="h-7 w-7 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-1.5 pl-9">
                    <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="h-8 flex-1 text-base"
                    />
                    <span className="text-gray-400 text-xs">〜</span>
                    <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="h-8 flex-1 text-base"
                    />
                </div>
            </div>
        );
    }

    if (isNotSubmitted) {
        const isLineFriend = submission.profiles?.line_is_friend === true;
        return (
            <div className="flex items-center gap-2 px-4 py-2">
                {submission.profiles?.avatar_url ? (
                    <button type="button" onClick={handleAvatarClick} className="flex-shrink-0">
                        <Image
                            src={submission.profiles.avatar_url}
                            alt=""
                            width={28}
                            height={28}
                            className="h-7 w-7 rounded-full object-cover"
                        />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleAvatarClick}
                        className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0"
                    >
                        {submission.profiles?.display_name?.charAt(0) || "?"}
                    </button>
                )}
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                    {submission.profiles?.display_name || "名前なし"}
                </p>
                {isLineFriend ? (
                    <button
                        type="button"
                        onClick={handleSendReminder}
                        disabled={isSending}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#06C755] hover:text-[#05b34d] disabled:opacity-50"
                    >
                        {isSending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Send className="h-3 w-3" />
                        )}
                        再通知
                    </button>
                ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                        LINE未連携
                    </span>
                )}
            </div>
        );
    }

    // 否認済み
    if (isRejected) {
        return (
            <div className="flex items-center gap-2 px-4 py-2">
                {submission.profiles?.avatar_url ? (
                    <button type="button" onClick={handleAvatarClick} className="flex-shrink-0">
                        <Image
                            src={submission.profiles.avatar_url}
                            alt=""
                            width={28}
                            height={28}
                            className="h-7 w-7 rounded-full object-cover"
                        />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleAvatarClick}
                        className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0"
                    >
                        {submission.profiles?.display_name?.charAt(0) || "?"}
                    </button>
                )}
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                    {submission.profiles?.display_name || "名前なし"}
                </p>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>
                        {submission.preferred_start_time?.slice(0, 5) || "--:--"} 〜{" "}
                        {submission.preferred_end_time?.slice(0, 5) || "--:--"}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => onRevert(submission.id)}
                    disabled={isProcessing}
                    className="h-7 w-7 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center disabled:opacity-50"
                >
                    {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                </button>
            </div>
        );
    }

    // 確定済み
    return (
        <div className="flex items-center gap-2 px-4 py-2">
            {submission.profiles?.avatar_url ? (
                <button type="button" onClick={handleAvatarClick} className="flex-shrink-0">
                    <Image
                        src={submission.profiles.avatar_url}
                        alt=""
                        width={28}
                        height={28}
                        className="h-7 w-7 rounded-full object-cover"
                    />
                </button>
            ) : (
                <button
                    type="button"
                    onClick={handleAvatarClick}
                    className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0"
                >
                    {submission.profiles?.display_name?.charAt(0) || "?"}
                </button>
            )}
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                {submission.profiles?.display_name || "名前なし"}
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3" />
                <span>
                    {submission.preferred_start_time?.slice(0, 5) || "--:--"} 〜{" "}
                    {submission.preferred_end_time?.slice(0, 5) || "--:--"}
                </span>
            </div>
            {isConfirmed && (
                <button
                    type="button"
                    onClick={() => onRevert(submission.id)}
                    disabled={isProcessing}
                    className="h-7 w-7 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center disabled:opacity-50"
                >
                    {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                </button>
            )}
        </div>
    );
}

function formatDisplayDateFull(dateStr: string): string {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
    return `${year}年${month}月${day}日（${weekDays[date.getDay()]}）`;
}

// 出勤予定追加モーダル
function AddUserModal({
    isOpen,
    onClose,
    submissions,
    roleTab,
    storeId,
    workDate,
    profileId,
    onAdded,
}: {
    isOpen: boolean;
    onClose: () => void;
    submissions: ShiftSubmission[];
    roleTab: "cast" | "staff";
    storeId: string;
    workDate: string;
    profileId: string;
    onAdded: () => void;
}) {
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [startTime, setStartTime] = useState("20:00");
    const [endTime, setEndTime] = useState("01:00");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // 未提出のユーザーのみ表示
    const notSubmittedUsers = submissions.filter((s) => {
        const role = s.profiles?.role;
        const matchesRole = roleTab === "cast"
            ? role === "cast"
            : role === "staff" || role === "admin";
        return matchesRole && (s.status === "not_submitted" || !s.status);
    });

    // 検索フィルタリング
    const filteredUsers = notSubmittedUsers.filter((user) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const name = user.profiles?.display_name || "";
        const kana = user.profiles?.display_name_kana || "";
        return name.toLowerCase().includes(query) || kana.toLowerCase().includes(query);
    });

    const handleSubmit = async () => {
        if (!selectedProfileId) return;
        setIsSubmitting(true);
        try {
            const result = await createWorkRecord({
                profileId: selectedProfileId,
                storeId,
                workDate,
                scheduledStartTime: startTime,
                scheduledEndTime: endTime,
                approvedBy: profileId,
            });
            if (result.success) {
                onAdded();
            }
        } catch (error) {
            console.error("Error creating work record:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-gray-900 dark:text-white">
                        出勤予定を追加
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* User Select */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            メンバーを選択
                        </label>
                        {/* 検索入力 */}
                        <Input
                            type="text"
                            placeholder="名前で検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9"
                        />
                        {notSubmittedUsers.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                追加できるメンバーがいません
                            </p>
                        ) : filteredUsers.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                                該当するメンバーがいません
                            </p>
                        ) : (
                            <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                                {filteredUsers.map((user) => (
                                    <button
                                        key={user.profile_id}
                                        type="button"
                                        onClick={() => setSelectedProfileId(user.profile_id)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                                            selectedProfileId === user.profile_id
                                                ? "bg-blue-100 dark:bg-blue-900/30"
                                                : "hover:bg-gray-100 dark:hover:bg-gray-800"
                                        }`}
                                    >
                                        {user.profiles?.avatar_url ? (
                                            <Image
                                                src={user.profiles.avatar_url}
                                                alt=""
                                                width={28}
                                                height={28}
                                                className="h-7 w-7 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400">
                                                {user.profiles?.display_name?.charAt(0) || "?"}
                                            </div>
                                        )}
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {user.profiles?.display_name || "名前なし"}
                                        </span>
                                        {selectedProfileId === user.profile_id && (
                                            <Check className="h-4 w-4 ml-auto text-blue-600 dark:text-blue-400" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
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
                </div>

                <div className="flex gap-2 mt-4">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                    >
                        キャンセル
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!selectedProfileId || isSubmitting}
                        className="flex-1"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            "追加"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
