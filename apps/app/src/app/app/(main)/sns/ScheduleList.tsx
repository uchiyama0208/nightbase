"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Loader2, Clock, RefreshCw, Link2 } from "lucide-react";
import {
    type SnsAccount,
    type SnsRecurringSchedule,
    type SnsTemplate,
    createRecurringSchedule,
    updateRecurringSchedule,
    deleteRecurringSchedule,
    toggleRecurringSchedule,
} from "./actions";

interface ScheduleListProps {
    recurringSchedules: SnsRecurringSchedule[];
    templates: SnsTemplate[];
    storeId: string;
    accounts: SnsAccount[];
    externalModalOpen?: boolean;
    onExternalModalClose?: () => void;
}

export function ScheduleList({
    recurringSchedules,
    templates,
    storeId,
    accounts,
    externalModalOpen,
    onExternalModalClose,
}: ScheduleListProps) {
    const router = useRouter();
    const [showRecurringModal, setShowRecurringModal] = useState(false);
    const [editingRecurring, setEditingRecurring] = useState<SnsRecurringSchedule | null>(null);

    // Check connected accounts
    const isXConnected = accounts.some(a => a.platform === "x" && a.is_connected);
    const isInstagramConnected = accounts.some(a => a.platform === "instagram" && a.is_connected);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form state for recurring schedule
    const [name, setName] = useState("");
    const [contentType, setContentType] = useState<"cast_list" | "template" | "ai_generated">("cast_list");
    const [templateId, setTemplateId] = useState<string | null>(null);
    const [imageStyle, setImageStyle] = useState<"none" | "photo_collage" | "text_design">("none");
    const [selectedPlatform, setSelectedPlatform] = useState<"x" | "instagram" | null>(null);
    const [instagramType, setInstagramType] = useState<"post" | "story">("post");
    const [scheduleHour, setScheduleHour] = useState(18);
    const [isActive, setIsActive] = useState(true);

    const openCreateRecurringModal = () => {
        setEditingRecurring(null);
        setName("");
        setContentType("cast_list");
        setTemplateId(null);
        setImageStyle("none");
        setSelectedPlatform(null);
        setInstagramType("post");
        setScheduleHour(18);
        setIsActive(true);
        setShowRecurringModal(true);
    };

    // Handle external modal open
    useEffect(() => {
        if (externalModalOpen) {
            openCreateRecurringModal();
        }
    }, [externalModalOpen]);

    // Handle modal close
    const handleModalClose = (open: boolean) => {
        setShowRecurringModal(open);
        if (!open && onExternalModalClose) {
            onExternalModalClose();
        }
    };

    const handleConnect = (platform: "x" | "instagram") => {
        window.location.href = `/api/sns/${platform}/auth?store_id=${storeId}`;
    };

    const openEditRecurringModal = (schedule: SnsRecurringSchedule) => {
        setEditingRecurring(schedule);
        setName(schedule.name);
        setContentType(schedule.content_type);
        setTemplateId(schedule.template_id);
        setImageStyle(schedule.image_style || "none");
        setSelectedPlatform(schedule.platforms[0] as "x" | "instagram" || null);
        setInstagramType(schedule.instagram_type || "post");
        setScheduleHour(schedule.schedule_hour);
        setIsActive(schedule.is_active);
        setShowRecurringModal(true);
    };

    const handleSaveRecurring = async () => {
        if (!name.trim() || !selectedPlatform) return;

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("content_type", contentType);
            formData.append("image_style", imageStyle);
            formData.append("platforms", JSON.stringify([selectedPlatform]));
            formData.append("instagram_type", instagramType);
            formData.append("schedule_hour", String(scheduleHour));
            if (templateId) {
                formData.append("template_id", templateId);
            }

            if (editingRecurring) {
                formData.append("id", editingRecurring.id);
                formData.append("is_active", String(isActive));
                await updateRecurringSchedule(formData);
            } else {
                await createRecurringSchedule(formData);
            }

            handleModalClose(false);
            router.refresh();
        } catch (error) {
            console.error("Error saving recurring schedule:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRecurring = async () => {
        if (!deletingId) return;

        setIsSubmitting(true);
        try {
            await deleteRecurringSchedule(deletingId);
            setShowDeleteConfirm(false);
            setDeletingId(null);
            router.refresh();
        } catch (error) {
            console.error("Error deleting recurring schedule:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (id: string, currentlyActive: boolean) => {
        try {
            await toggleRecurringSchedule(id, !currentlyActive);
            router.refresh();
        } catch (error) {
            console.error("Error toggling recurring schedule:", error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Recurring schedules section */}
            <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    繰り返しスケジュール
                </h3>
                {recurringSchedules.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            繰り返しスケジュールがありません
                        </p>
                    </div>
                ) : (
                    recurringSchedules.map((schedule) => (
                        <div
                            key={schedule.id}
                            className={`rounded-2xl border bg-white dark:bg-gray-900 p-4 ${
                                schedule.is_active
                                    ? "border-gray-200 dark:border-gray-700"
                                    : "border-gray-200/50 dark:border-gray-700/50 opacity-60"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                            {schedule.name}
                                        </h4>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                                            schedule.is_active
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                        }`}>
                                            {schedule.is_active ? "有効" : "無効"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Clock className="h-4 w-4" />
                                        毎日 {String(schedule.schedule_hour).padStart(2, "0")}:00
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                            {schedule.content_type === "cast_list" && "出勤キャスト"}
                                            {schedule.content_type === "template" && "テンプレート"}
                                            {schedule.content_type === "ai_generated" && "AI生成"}
                                        </span>
                                        {schedule.platforms.map((p) => (
                                            <span
                                                key={p}
                                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                            >
                                                {p === "x" ? "X" : "Instagram"}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={schedule.is_active}
                                        onCheckedChange={() => handleToggleActive(schedule.id, schedule.is_active)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => openEditRecurringModal(schedule)}
                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm text-gray-600 dark:text-gray-400"
                                    >
                                        編集
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDeletingId(schedule.id);
                                            setShowDeleteConfirm(true);
                                        }}
                                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Recurring Schedule Modal */}
            <Dialog open={showRecurringModal} onOpenChange={handleModalClose}>
                <DialogContent className="max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
                            {editingRecurring ? "スケジュールを編集" : "スケジュールを作成"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>スケジュール名</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="例: 出勤情報自動投稿"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>投稿内容</Label>
                            <Select value={contentType} onValueChange={(v: any) => setContentType(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cast_list">出勤キャスト一覧</SelectItem>
                                    <SelectItem value="template">テンプレート</SelectItem>
                                    <SelectItem value="ai_generated">AI生成</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {contentType === "template" && (
                            <div className="space-y-2">
                                <Label>テンプレート</Label>
                                <Select value={templateId || ""} onValueChange={setTemplateId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="テンプレートを選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templates.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-3">
                            <Label>投稿対象</Label>
                            <div className="space-y-2">
                                {/* X */}
                                <div
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                        selectedPlatform === "x"
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                            : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                                    }`}
                                    onClick={() => isXConnected && setSelectedPlatform("x")}
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                            selectedPlatform === "x"
                                                ? "border-blue-500"
                                                : "border-gray-300 dark:border-gray-600"
                                        }`}>
                                            {selectedPlatform === "x" && (
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
                                                handleConnect("x");
                                            }}
                                            className="gap-1.5 text-xs"
                                        >
                                            <Link2 className="h-3.5 w-3.5" />
                                            連携
                                        </Button>
                                    )}
                                </div>

                                {/* Instagram */}
                                <div
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                        selectedPlatform === "instagram"
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                            : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                                    }`}
                                    onClick={() => isInstagramConnected && setSelectedPlatform("instagram")}
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                            selectedPlatform === "instagram"
                                                ? "border-blue-500"
                                                : "border-gray-300 dark:border-gray-600"
                                        }`}>
                                            {selectedPlatform === "instagram" && (
                                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-medium text-sm ${
                                                isInstagramConnected
                                                    ? "text-gray-900 dark:text-white"
                                                    : "text-gray-400 dark:text-gray-500"
                                            }`}>
                                                Instagram
                                            </span>
                                            {isInstagramConnected ? (
                                                <span className="text-xs text-green-600 dark:text-green-400">連携済み</span>
                                            ) : (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">未連携</span>
                                            )}
                                        </div>
                                    </div>
                                    {!isInstagramConnected && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleConnect("instagram");
                                            }}
                                            className="gap-1.5 text-xs"
                                        >
                                            <Link2 className="h-3.5 w-3.5" />
                                            連携
                                        </Button>
                                    )}
                                </div>

                                {/* Instagram type selector */}
                                {selectedPlatform === "instagram" && (
                                    <div className="ml-7 mt-2">
                                        <Select value={instagramType} onValueChange={(v: any) => setInstagramType(v)}>
                                            <SelectTrigger className="w-40">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="post">通常投稿</SelectItem>
                                                <SelectItem value="story">ストーリー</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>投稿時間</Label>
                            <Select value={String(scheduleHour)} onValueChange={(v) => setScheduleHour(parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <SelectItem key={i} value={String(i)}>
                                            {String(i).padStart(2, "0")}:00
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {editingRecurring && (
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="isActive"
                                    checked={isActive}
                                    onCheckedChange={(checked) => setIsActive(checked === true)}
                                />
                                <label
                                    htmlFor="isActive"
                                    className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                                >
                                    有効にする
                                </label>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => handleModalClose(false)}
                            disabled={isSubmitting}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleSaveRecurring}
                            disabled={isSubmitting || !name.trim() || !selectedPlatform}
                            className="rounded-lg"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    保存中...
                                </>
                            ) : (
                                "保存"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
                            スケジュールを削除
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        このスケジュールを削除しますか？
                    </p>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isSubmitting}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteRecurring}
                            disabled={isSubmitting}
                            className="rounded-lg"
                        >
                            {isSubmitting ? "削除中..." : "削除"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
