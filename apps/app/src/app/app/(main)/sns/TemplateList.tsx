"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Loader2, Info, Link2, Send, Clock, Eye, ChevronLeft } from "lucide-react";
import { formatJSTDateTime } from "@/lib/utils";
import {
    type SnsTemplate,
    type SnsAccount,
    type SnsScheduledPost,
    createSnsTemplate,
    createScheduledPost,
    deleteScheduledPost,
    postNow,
    getTemplatePreview,
} from "./actions";
import { TEMPLATE_VARIABLES } from "./constants";

interface TemplateListProps {
    templates: SnsTemplate[];
    storeId: string;
    accounts: SnsAccount[];
    scheduledPosts: SnsScheduledPost[];
    postHistory: SnsScheduledPost[];
    externalModalOpen?: boolean;
    onExternalModalClose?: () => void;
}

export function TemplateList({
    templates,
    storeId,
    accounts,
    scheduledPosts,
    postHistory,
    externalModalOpen,
    onExternalModalClose,
}: TemplateListProps) {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form state
    const [content, setContent] = useState("");
    const [isXSelected, setIsXSelected] = useState(false);
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [templateName, setTemplateName] = useState("");
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
    const [scheduledAt, setScheduledAt] = useState("");

    // Preview state
    const [preview, setPreview] = useState<string>("");
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    // Account connection status
    const xAccount = accounts.find(a => a.platform === "x");
    const isXConnected = xAccount?.is_connected ?? false;

    // Handle external modal open
    useEffect(() => {
        if (externalModalOpen) {
            openCreateModal();
        }
    }, [externalModalOpen]);

    // Handle modal close
    const handleModalClose = useCallback((open: boolean) => {
        setShowModal(open);
        if (!open && onExternalModalClose) {
            onExternalModalClose();
        }
    }, [onExternalModalClose]);

    // Load preview when content changes
    useEffect(() => {
        const loadPreview = async () => {
            if (!content.trim()) {
                setPreview("");
                return;
            }
            setIsLoadingPreview(true);
            try {
                const previewContent = await getTemplatePreview(content);
                setPreview(previewContent);
            } catch {
                setPreview(content);
            } finally {
                setIsLoadingPreview(false);
            }
        };

        const debounce = setTimeout(loadPreview, 500);
        return () => clearTimeout(debounce);
    }, [content]);

    const openCreateModal = () => {
        setContent("");
        setIsXSelected(false);
        setSaveAsTemplate(false);
        setTemplateName("");
        setSelectedTemplateId("");
        setPreview("");
        setShowModal(true);
    };

    const handleApplyTemplate = () => {
        const template = templates.find(t => t.id === selectedTemplateId);
        if (template) {
            setContent(template.content);
        }
    };

    const handlePost = async () => {
        if (!content.trim() || !isXSelected) return;

        setIsSubmitting(true);
        try {
            // Save as template if checked
            if (saveAsTemplate && templateName.trim()) {
                const formData = new FormData();
                formData.append("name", templateName);
                formData.append("content", content);
                formData.append("template_type", "text");
                formData.append("image_style", "");
                await createSnsTemplate(formData);
            }

            // Post immediately
            const formData = new FormData();
            formData.append("content", content);
            formData.append("platforms", JSON.stringify(["x"]));
            await postNow(formData);

            handleModalClose(false);
            router.refresh();
        } catch (error) {
            console.error("Error posting:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSchedulePost = async () => {
        if (!content.trim() || !isXSelected || !scheduledAt) return;

        setIsSubmitting(true);
        try {
            // Save as template if checked
            if (saveAsTemplate && templateName.trim()) {
                const formData = new FormData();
                formData.append("name", templateName);
                formData.append("content", content);
                formData.append("template_type", "text");
                formData.append("image_style", "");
                await createSnsTemplate(formData);
            }

            // Create scheduled post
            const formData = new FormData();
            formData.append("content", content);
            formData.append("platforms", JSON.stringify(["x"]));
            formData.append("scheduled_at", scheduledAt);
            await createScheduledPost(formData);

            setShowScheduleModal(false);
            handleModalClose(false);
            router.refresh();
        } catch (error) {
            console.error("Error scheduling post:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteScheduledPost = async () => {
        if (!deletingId) return;

        setIsSubmitting(true);
        try {
            await deleteScheduledPost(deletingId);
            setShowDeleteConfirm(false);
            setDeletingId(null);
            router.refresh();
        } catch (error) {
            console.error("Error deleting scheduled post:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConnect = () => {
        window.location.href = `/api/auth/x`;
    };

    const canPost = content.trim() && isXSelected && isXConnected;

    return (
        <div className="space-y-3">
            {/* Scheduled Posts */}
            {scheduledPosts.length > 0 && (
                <div className="space-y-3">
                    {scheduledPosts.map((post) => (
                        <div
                            key={post.id}
                            className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-1">
                                        <Clock className="h-5 w-5" />
                                        {formatJSTDateTime(post.scheduled_at)}
                                    </div>
                                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap line-clamp-2">
                                        {post.content}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {post.platforms.map((p) => (
                                            <span
                                                key={p}
                                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300"
                                            >
                                                X
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDeletingId(post.id);
                                        setShowDeleteConfirm(true);
                                    }}
                                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                >
                                    <Trash2 className="h-5 w-5 text-red-500 dark:text-red-400" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Post History */}
            <div className="space-y-3">
                {postHistory.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            投稿履歴がありません
                        </p>
                    </div>
                ) : (
                    postHistory.map((post) => (
                        <div
                            key={post.id}
                            className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        {formatJSTDateTime(post.scheduled_at)}
                                    </div>
                                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap line-clamp-2">
                                        {post.content}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {post.platforms.map((p) => (
                                            <span
                                                key={p}
                                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                            >
                                                X
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Post Modal */}
            <Dialog open={showModal} onOpenChange={handleModalClose}>
                <DialogContent className="sm:max-w-lg rounded-2xl border border-gray-200 bg-white p-0 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={() => handleModalClose(false)}
                            className="p-1 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-base font-semibold text-gray-900 dark:text-white">
                            投稿を作成
                        </DialogTitle>
                        <div className="w-8" />
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        {/* Template selection */}
                        {templates.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">テンプレートから選択</Label>
                                <div className="flex gap-2">
                                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="テンプレートを選択..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates.map((t) => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleApplyTemplate}
                                        disabled={!selectedTemplateId}
                                        className="rounded-lg shrink-0"
                                    >
                                        決定
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* 投稿対象 */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">投稿対象</Label>
                            <div
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                    isXSelected
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                        : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                                }`}
                                onClick={() => isXConnected && setIsXSelected(!isXSelected)}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                        isXSelected
                                            ? "border-blue-500"
                                            : "border-gray-300 dark:border-gray-600"
                                    }`}>
                                        {isXSelected && (
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-medium text-sm ${
                                            isXConnected
                                                ? "text-gray-900 dark:text-white"
                                                : "text-gray-400 dark:text-gray-500"
                                        }`}>
                                            X (Twitter)
                                        </span>
                                        {isXConnected ? (
                                            <span className="text-xs text-green-600 dark:text-green-400">連携済み</span>
                                        ) : (
                                            <span className="text-xs text-gray-500 dark:text-gray-400">未連携</span>
                                        )}
                                    </div>
                                </div>
                                {!isXConnected && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleConnect();
                                        }}
                                        className="gap-1.5 text-xs"
                                    >
                                        <Link2 className="h-3.5 w-3.5" />
                                        連携
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">投稿内容</Label>
                            <Textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="投稿内容を入力..."
                                className="min-h-[120px] resize-none"
                            />
                        </div>

                        {/* Variables */}
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 space-y-2">
                            <div className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                                <Info className="h-3 w-3" />
                                使える変数
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {TEMPLATE_VARIABLES.map((v) => (
                                    <button
                                        key={v.key}
                                        type="button"
                                        onClick={() => setContent((prev) => prev + v.key)}
                                        className="px-2 py-1 rounded text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                        title={v.description}
                                    >
                                        {v.key}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Preview */}
                        {content.trim() && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <Eye className="h-4 w-4" />
                                    プレビュー
                                </div>
                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3">
                                    {isLoadingPreview ? (
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            読み込み中...
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                                            {preview || content}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Template name for saving as template */}
                        {saveAsTemplate && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">テンプレート名</Label>
                                <Input
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    placeholder="例: 出勤情報お知らせ"
                                />
                            </div>
                        )}

                        {/* Save as template checkbox */}
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="saveAsTemplate"
                                checked={saveAsTemplate}
                                onCheckedChange={(checked) => setSaveAsTemplate(checked === true)}
                            />
                            <label
                                htmlFor="saveAsTemplate"
                                className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                            >
                                テンプレートとして保存
                            </label>
                        </div>
                    </div>
                    <div className="flex-shrink-0 px-6 pb-6 space-y-2">
                        <Button
                            onClick={handlePost}
                            disabled={isSubmitting || !canPost || (saveAsTemplate && !templateName.trim())}
                            className="w-full rounded-lg gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    投稿中...
                                </>
                            ) : (
                                <>
                                    <Send className="h-5 w-5" />
                                    投稿
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setShowScheduleModal(true)}
                            disabled={isSubmitting || !canPost || (saveAsTemplate && !templateName.trim())}
                            className="w-full rounded-lg gap-1.5"
                        >
                            <Clock className="h-5 w-5" />
                            予約投稿
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Schedule Modal */}
            <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
                <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 bg-white p-0 shadow-xl dark:border-gray-800 dark:bg-gray-900 flex flex-col">
                    <DialogHeader className="flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={() => setShowScheduleModal(false)}
                            className="p-1 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-base font-semibold text-gray-900 dark:text-white">
                            予約投稿
                        </DialogTitle>
                        <div className="w-8" />
                    </DialogHeader>
                    <div className="px-6 py-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">投稿日時</Label>
                            <Input
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-shrink-0 px-6 pb-6 space-y-2">
                        <Button
                            onClick={handleSchedulePost}
                            disabled={isSubmitting || !scheduledAt}
                            className="w-full rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    予約中...
                                </>
                            ) : (
                                "予約する"
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setShowScheduleModal(false)}
                            disabled={isSubmitting}
                            className="w-full rounded-lg"
                        >
                            キャンセル
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
                            予約投稿を削除
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        この予約投稿を削除しますか？
                    </p>
                    <DialogFooter className="flex-col gap-2">
                        <Button
                            variant="destructive"
                            onClick={handleDeleteScheduledPost}
                            disabled={isSubmitting}
                            className="w-full rounded-lg"
                        >
                            {isSubmitting ? "削除中..." : "削除"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isSubmitting}
                            className="w-full rounded-lg"
                        >
                            キャンセル
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
