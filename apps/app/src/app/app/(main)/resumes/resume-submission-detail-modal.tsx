"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Phone, MapPin, Calendar, Building, Trash2, ChevronLeft, IdCard } from "lucide-react";
import { formatJSTDate } from "@/lib/utils";
import {
    getSubmissionDetails,
    hireApplicant,
    rejectApplicant,
    deleteSubmission,
    checkDisplayNameDuplicate,
    revertSubmissionStatus,
    getSubmissionComments,
    addSubmissionComment,
    updateSubmissionComment,
    deleteSubmissionComment,
    toggleSubmissionCommentLike,
    getCurrentProfileInfo,
    getIdVerificationImageUrls,
} from "./actions";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { CommentList } from "@/components/comment-list";
import { useGlobalLoading } from "@/components/global-loading";

interface ResumeSubmission {
    id: string;
    store_id: string;
    template_id: string;
    token: string;
    status: string;
    profile_id: string | null;
    last_name: string | null;
    first_name: string | null;
    last_name_kana: string | null;
    first_name_kana: string | null;
    birth_date: string | null;
    phone_number: string | null;
    emergency_phone_number: string | null;
    zip_code: string | null;
    prefecture: string | null;
    city: string | null;
    street: string | null;
    building: string | null;
    desired_cast_name: string | null;
    desired_cast_name_kana: string | null;
    submitted_at: string | null;
    created_at: string;
    id_verification_images: string[] | null;
    resume_templates: {
        id: string;
        name: string;
    } | null;
}

interface PastEmployment {
    id: string;
    store_name: string;
    position: string | null;
    start_date: string | null;
    end_date: string | null;
    reason_for_leaving: string | null;
}

interface CustomAnswer {
    id: string;
    field_id: string;
    value: string;
    resume_template_fields: {
        label: string;
        field_type: string;
    };
}

interface ResumeSubmissionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    submission: ResumeSubmission;
}

export function ResumeSubmissionDetailModal({
    isOpen,
    onClose,
    submission,
}: ResumeSubmissionDetailModalProps) {
    const router = useRouter();
    const { showLoading, hideLoading } = useGlobalLoading();
    const [isLoading, setIsLoading] = useState(true);
    const [isHiring, setIsHiring] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isReverting, setIsReverting] = useState(false);
    const [showHireConfirm, setShowHireConfirm] = useState(false);
    const [showRejectConfirm, setShowRejectConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showRevertConfirm, setShowRevertConfirm] = useState(false);
    const [hireType, setHireType] = useState<"trial" | "full">("full");
    const [pastEmployments, setPastEmployments] = useState<PastEmployment[]>([]);
    const [customAnswers, setCustomAnswers] = useState<CustomAnswer[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [idVerificationUrls, setIdVerificationUrls] = useState<string[]>([]);
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

    // 採用時の名前編集用
    const [editDisplayName, setEditDisplayName] = useState("");
    const [editDisplayNameKana, setEditDisplayNameKana] = useState("");
    const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
    const [createProfile, setCreateProfile] = useState(true);

    useEffect(() => {
        if (isOpen && submission) {
            loadDetails();
            // 初期値をセット
            setEditDisplayName(submission.desired_cast_name || "");
            setEditDisplayNameKana(submission.desired_cast_name_kana || "");
            setDuplicateWarning(null);
        }
    }, [isOpen, submission]);

    const loadDetails = async () => {
        setIsLoading(true);
        try {
            const [details, commentsData, profileInfo] = await Promise.all([
                getSubmissionDetails(submission.id),
                getSubmissionComments(submission.id),
                getCurrentProfileInfo(),
            ]);
            setPastEmployments(details.pastEmployments || []);
            setCustomAnswers(details.customAnswers || []);
            setComments(commentsData || []);
            setCurrentProfileId(profileInfo.profileId);
            setIsAdmin(profileInfo.role === "admin");

            // Load ID verification images if present
            if (submission.id_verification_images && submission.id_verification_images.length > 0) {
                const urls = await getIdVerificationImageUrls(submission.id_verification_images);
                setIdVerificationUrls(urls);
            } else {
                setIdVerificationUrls([]);
            }
        } catch (error) {
            console.error("Failed to load details:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const refreshComments = async () => {
        const commentsData = await getSubmissionComments(submission.id);
        setComments(commentsData || []);
    };

    const handleAddComment = useCallback(async (content: string) => {
        showLoading("保存中...");
        try {
            await addSubmissionComment(submission.id, content);
            await refreshComments();
            return { success: true };
        } catch (error) {
            console.error("Failed to add comment:", error);
            toast({ title: "コメントの追加に失敗しました", variant: "destructive" });
            return { success: false, error: "コメントの追加に失敗しました" };
        } finally {
            hideLoading();
        }
    }, [submission.id, showLoading, hideLoading]);

    const handleEditComment = useCallback(async (commentId: string, content: string) => {
        showLoading("保存中...");
        try {
            await updateSubmissionComment(commentId, content);
            await refreshComments();
            return { success: true };
        } catch (error) {
            console.error("Failed to edit comment:", error);
            toast({ title: "コメントの更新に失敗しました", variant: "destructive" });
            return { success: false, error: "コメントの更新に失敗しました" };
        } finally {
            hideLoading();
        }
    }, [showLoading, hideLoading]);

    const handleDeleteComment = useCallback(async (commentId: string) => {
        showLoading("保存中...");
        try {
            await deleteSubmissionComment(commentId);
            await refreshComments();
            return { success: true };
        } catch (error) {
            console.error("Failed to delete comment:", error);
            toast({ title: "コメントの削除に失敗しました", variant: "destructive" });
            return { success: false, error: "コメントの削除に失敗しました" };
        } finally {
            hideLoading();
        }
    }, [showLoading, hideLoading]);

    const handleToggleLike = useCallback(async (commentId: string) => {
        showLoading("保存中...");
        try {
            await toggleSubmissionCommentLike(commentId);
            await refreshComments();
            return { success: true };
        } catch (error) {
            console.error("Failed to toggle like:", error);
            toast({ title: "いいねの切り替えに失敗しました", variant: "destructive" });
            return { success: false, error: "いいねの切り替えに失敗しました" };
        } finally {
            hideLoading();
        }
    }, [showLoading, hideLoading]);

    const handleHire = async () => {
        // プロフィール作成時のみ重複チェック
        if (createProfile && editDisplayNameKana?.trim()) {
            try {
                const result = await checkDisplayNameDuplicate(editDisplayNameKana.trim());
                if (result.isDuplicate) {
                    setDuplicateWarning(`同じ読み方の名前が既に存在します: ${result.existingNames.join(", ")}`);
                    return; // 採用処理を中断
                }
            } catch (error) {
                console.error("Failed to check duplicate:", error);
            }
        }

        setIsHiring(true);
        try {
            await hireApplicant(
                submission.id,
                hireType,
                createProfile ? editDisplayName || undefined : undefined,
                createProfile ? editDisplayNameKana || undefined : undefined,
                createProfile
            );
            router.refresh();
            onClose();
        } catch (error) {
            console.error("Failed to hire:", error);
            toast({ title: "採用処理に失敗しました", variant: "destructive" });
        } finally {
            setIsHiring(false);
            setShowHireConfirm(false);
        }
    };

    const handleReject = async () => {
        setIsRejecting(true);
        try {
            await rejectApplicant(submission.id);
            router.refresh();
            onClose();
        } catch (error) {
            console.error("Failed to reject:", error);
            toast({ title: "不採用処理に失敗しました", variant: "destructive" });
        } finally {
            setIsRejecting(false);
            setShowRejectConfirm(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteSubmission(submission.id);
            router.refresh();
            onClose();
        } catch (error) {
            console.error("Failed to delete:", error);
            toast({ title: "削除に失敗しました", variant: "destructive" });
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleRevert = async (deleteProfile: boolean) => {
        setIsReverting(true);
        try {
            await revertSubmissionStatus(submission.id, deleteProfile);
            router.refresh();
            onClose();
        } catch (error) {
            console.error("Failed to revert:", error);
            toast({ title: "採否前に戻す処理に失敗しました", variant: "destructive" });
        } finally {
            setIsReverting(false);
            setShowRevertConfirm(false);
        }
    };

    const getFullName = () => {
        if (submission.last_name && submission.first_name) {
            return `${submission.last_name} ${submission.first_name}`;
        }
        return "-";
    };

    const getFullNameKana = () => {
        if (submission.last_name_kana && submission.first_name_kana) {
            return `${submission.last_name_kana} ${submission.first_name_kana}`;
        }
        return null;
    };

    const getFullAddress = () => {
        const parts = [
            submission.prefecture,
            submission.city,
            submission.street,
            submission.building,
        ].filter(Boolean);
        return parts.length > 0 ? parts.join("") : "-";
    };

    const getAge = () => {
        if (!submission.birth_date) return null;
        const birth = new Date(submission.birth_date);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl sm:max-w-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
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
                            履歴書詳細
                        </DialogTitle>
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            aria-label="削除"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {isLoading ? (
                            <div className="text-center py-8 text-gray-500">読み込み中...</div>
                        ) : (
                            <>
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                                        <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                            <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {getFullName()}
                                            </p>
                                            {getFullNameKana() && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {getFullNameKana()}
                                                </p>
                                            )}
                                        </div>
                                        {submission.profile_id && (
                                            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                採用済み
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Birth Date & Age */}
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                生年月日
                                            </Label>
                                            <p className="text-sm text-gray-900 dark:text-white">
                                                {submission.birth_date ? formatJSTDate(submission.birth_date) : "-"}
                                                {getAge() !== null && (
                                                    <span className="text-gray-500 ml-1">({getAge()}歳)</span>
                                                )}
                                            </p>
                                        </div>

                                        {/* Desired Name */}
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-500 dark:text-gray-400">
                                                希望キャスト名
                                            </Label>
                                            <p className="text-sm text-gray-900 dark:text-white">
                                                {submission.desired_cast_name || "-"}
                                                {submission.desired_cast_name_kana && (
                                                    <span className="text-gray-500 ml-1">
                                                        ({submission.desired_cast_name_kana})
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Phone */}
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <Phone className="h-3 w-3" />
                                                電話番号
                                            </Label>
                                            <p className="text-sm text-gray-900 dark:text-white">
                                                {submission.phone_number || "-"}
                                            </p>
                                        </div>

                                        {/* Emergency Phone */}
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-500 dark:text-gray-400">
                                                緊急連絡先
                                            </Label>
                                            <p className="text-sm text-gray-900 dark:text-white">
                                                {submission.emergency_phone_number || "-"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Address */}
                                    <div className="space-y-1">
                                        <Label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            住所
                                        </Label>
                                        <p className="text-sm text-gray-900 dark:text-white">
                                            {submission.zip_code && `〒${submission.zip_code} `}
                                            {getFullAddress()}
                                        </p>
                                    </div>
                                </div>

                                {/* Past Employments */}
                                {pastEmployments.length > 0 && (
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                                            <Building className="h-4 w-4" />
                                            過去在籍店 ({pastEmployments.length}件)
                                        </Label>
                                        <div className="space-y-2">
                                            {pastEmployments.map((emp) => (
                                                <div
                                                    key={emp.id}
                                                    className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                                                >
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                        {emp.store_name}
                                                        {emp.position && (
                                                            <span className="text-gray-500 font-normal ml-2">
                                                                ({emp.position})
                                                            </span>
                                                        )}
                                                    </p>
                                                    {(emp.start_date || emp.end_date) && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            {emp.start_date && formatJSTDate(emp.start_date)}
                                                            {emp.start_date && emp.end_date && " 〜 "}
                                                            {emp.end_date && formatJSTDate(emp.end_date)}
                                                        </p>
                                                    )}
                                                    {emp.reason_for_leaving && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            退店理由: {emp.reason_for_leaving}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ID Verification Images */}
                                {idVerificationUrls.length > 0 && (
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                                            <IdCard className="h-4 w-4" />
                                            身分証明証 ({idVerificationUrls.length}件)
                                        </Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {idVerificationUrls.map((url, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => setSelectedImageUrl(url)}
                                                    className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                                                >
                                                    <img
                                                        src={url}
                                                        alt={`身分証明証 ${index + 1}`}
                                                        className="w-full h-24 object-cover"
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Custom Answers */}
                                {customAnswers.length > 0 && (
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                            その他の回答
                                        </Label>
                                        <div className="space-y-3">
                                            {customAnswers.map((answer) => (
                                                <div key={answer.id} className="space-y-1">
                                                    <Label className="text-xs text-gray-500 dark:text-gray-400">
                                                        {answer.resume_template_fields?.label}
                                                    </Label>
                                                    <p className="text-sm text-gray-900 dark:text-white">
                                                        {answer.value === "true" ? "はい" :
                                                         answer.value === "false" ? "いいえ" :
                                                         answer.value || "-"}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Submission Info */}
                                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {submission.resume_templates?.name} •
                                        応募日: {submission.submitted_at ? formatJSTDate(submission.submitted_at) : "-"}
                                    </p>
                                </div>

                                {/* Comments */}
                                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        コメント
                                    </Label>
                                    <CommentList
                                        comments={comments}
                                        currentUserId={currentProfileId}
                                        isAdmin={isAdmin}
                                        onAddComment={handleAddComment}
                                        onEditComment={handleEditComment}
                                        onDeleteComment={handleDeleteComment}
                                        onToggleLike={handleToggleLike}
                                    />
                                </div>

                                {/* Action Buttons - not fixed */}
                                <div className="pt-4 space-y-3">
                                    {!submission.profile_id && submission.status !== "rejected" && (
                                        <>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setHireType("trial");
                                                        setEditDisplayName(submission.desired_cast_name || "");
                                                        setEditDisplayNameKana(submission.desired_cast_name_kana || "");
                                                        setDuplicateWarning(null);
                                                        setCreateProfile(true);
                                                        setShowHireConfirm(true);
                                                    }}
                                                    className="flex-1 rounded-lg"
                                                >
                                                    採用(体入)
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        setHireType("full");
                                                        setEditDisplayName(submission.desired_cast_name || "");
                                                        setEditDisplayNameKana(submission.desired_cast_name_kana || "");
                                                        setDuplicateWarning(null);
                                                        setCreateProfile(true);
                                                        setShowHireConfirm(true);
                                                    }}
                                                    className="flex-1 rounded-lg"
                                                >
                                                    採用(本入)
                                                </Button>
                                            </div>

                                            <div className="border-t border-gray-200 dark:border-gray-700" />

                                            <Button
                                                variant="outline"
                                                onClick={() => setShowRejectConfirm(true)}
                                                className="w-full rounded-lg border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                            >
                                                不採用
                                            </Button>
                                        </>
                                    )}
                                    {/* 採否前に戻すボタン - 採用済みまたは不採用の場合に表示 */}
                                    {(submission.profile_id || submission.status === "rejected") && (
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowRevertConfirm(true)}
                                            className="w-full rounded-lg"
                                        >
                                            採否前に戻す
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        onClick={onClose}
                                        className="w-full rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    >
                                        閉じる
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Hire Confirmation Dialog */}
            <Dialog open={showHireConfirm} onOpenChange={setShowHireConfirm}>
                <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                            採用確認
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {getFullName()}さんを{hireType === "trial" ? "体入" : "本入"}として採用しますか？
                        </p>

                        {/* プロフィール自動作成 */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div>
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    プロフィールを自動作成
                                </Label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    採用と同時にプロフィールを作成します
                                </p>
                            </div>
                            <Switch
                                checked={createProfile}
                                onCheckedChange={setCreateProfile}
                            />
                        </div>

                        {createProfile && (
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        キャスト名（源氏名）
                                    </Label>
                                    <Input
                                        value={editDisplayName}
                                        onChange={(e) => setEditDisplayName(e.target.value)}
                                        placeholder="あいり"
                                        className="rounded-lg"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        キャスト名（かな）
                                    </Label>
                                    <Input
                                        value={editDisplayNameKana}
                                        onChange={(e) => {
                                            setEditDisplayNameKana(e.target.value);
                                            setDuplicateWarning(null);
                                        }}
                                        placeholder="あいり"
                                        className="rounded-lg"
                                    />
                                    {duplicateWarning && (
                                        <p className="text-xs text-orange-600 dark:text-orange-400">
                                            {duplicateWarning}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowHireConfirm(false)}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleHire}
                            disabled={isHiring}
                            className="rounded-lg"
                        >
                            {isHiring ? "処理中..." : `採用する(${hireType === "trial" ? "体入" : "本入"})`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Confirmation Dialog */}
            <Dialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
                <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                            不採用確認
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {getFullName()}さんを不採用にしますか？
                    </p>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowRejectConfirm(false)}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={isRejecting}
                            className="rounded-lg"
                        >
                            {isRejecting ? "処理中..." : "不採用にする"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                            削除確認
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {getFullName()}さんの履歴書を削除しますか？
                        <br />
                        この操作は取り消せません。
                    </p>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="rounded-lg"
                        >
                            {isDeleting ? "削除中..." : "削除する"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revert Status Confirmation Dialog */}
            <Dialog open={showRevertConfirm} onOpenChange={setShowRevertConfirm}>
                <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                            採否前に戻す
                        </DialogTitle>
                    </DialogHeader>
                    {submission.profile_id ? (
                        <>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {getFullName()}さんを採否前の状態に戻しますか？
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                採用時に作成されたプロフィールを削除しますか？
                            </p>
                            <DialogFooter className="flex-col gap-2">
                                <Button
                                    variant="destructive"
                                    onClick={() => handleRevert(true)}
                                    disabled={isReverting}
                                    className="w-full rounded-lg"
                                >
                                    {isReverting ? "処理中..." : "プロフィールを削除して戻す"}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleRevert(false)}
                                    disabled={isReverting}
                                    className="w-full rounded-lg"
                                >
                                    {isReverting ? "処理中..." : "プロフィールを残して戻す"}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowRevertConfirm(false)}
                                    className="w-full rounded-lg text-gray-500"
                                >
                                    キャンセル
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {getFullName()}さんを採否前の状態に戻しますか？
                            </p>
                            <DialogFooter className="gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowRevertConfirm(false)}
                                    className="rounded-lg"
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    onClick={() => handleRevert(false)}
                                    disabled={isReverting}
                                    className="rounded-lg"
                                >
                                    {isReverting ? "処理中..." : "戻す"}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Image Preview Dialog */}
            <Dialog open={!!selectedImageUrl} onOpenChange={() => setSelectedImageUrl(null)}>
                <DialogContent className="p-0 max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="sr-only">
                        <DialogTitle>身分証明証画像</DialogTitle>
                    </DialogHeader>
                    {selectedImageUrl && (
                        <div className="relative">
                            <img
                                src={selectedImageUrl}
                                alt="身分証明証"
                                className="w-full h-auto max-h-[85vh] object-contain"
                            />
                            <button
                                type="button"
                                onClick={() => setSelectedImageUrl(null)}
                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4 rotate-180" />
                            </button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
