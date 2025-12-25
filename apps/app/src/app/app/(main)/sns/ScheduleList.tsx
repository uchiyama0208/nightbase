"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Trash2, Loader2, Clock, Link2, ChevronLeft } from "lucide-react";
import {
    type SnsAccount,
    type SnsRecurringSchedule,
    type SnsTemplate,
    createRecurringSchedule,
    updateRecurringSchedule,
    deleteRecurringSchedule,
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

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form state for recurring schedule
    const [name, setName] = useState("");
    const [contentType, setContentType] = useState<"cast_list" | "template">("cast_list");
    const [templateId, setTemplateId] = useState<string | null>(null);
    const [imageStyle, setImageStyle] = useState<"none" | "photo_collage" | "text_design">("none");
    const [isXSelected, setIsXSelected] = useState(false);
    const [scheduleHour, setScheduleHour] = useState(18);
    const [isActive, setIsActive] = useState(true);

    const openCreateRecurringModal = () => {
        setEditingRecurring(null);
        setName("");
        setContentType("cast_list");
        setTemplateId(null);
        setImageStyle("none");
        setIsXSelected(false);
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

    const handleConnect = () => {
        window.location.href = `/api/auth/x`;
    };

    const openEditRecurringModal = (schedule: SnsRecurringSchedule) => {
        setEditingRecurring(schedule);
        setName(schedule.name);
        setContentType(schedule.content_type);
        setTemplateId(schedule.template_id);
        setImageStyle(schedule.image_style || "none");
        setIsXSelected(schedule.platforms.includes("x"));
        setScheduleHour(schedule.schedule_hour);
        setIsActive(schedule.is_active);
        setShowRecurringModal(true);
    };

    const handleSaveRecurring = async () => {
        if (!name.trim() || !isXSelected) return;

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("content_type", contentType);
            formData.append("image_style", imageStyle);
            formData.append("platforms", JSON.stringify(["x"]));
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

    return (
        <div className="space-y-3">
            {/* Recurring schedules section */}
            <div className="space-y-3">
                {recurringSchedules.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            繰り返しスケジュールがありません
                        </p>
                    </div>
                ) : (
                    recurringSchedules.map((schedule) => (
                        <button
                            key={schedule.id}
                            type="button"
                            onClick={() => openEditRecurringModal(schedule)}
                            className={`w-full text-left rounded-2xl border bg-white dark:bg-gray-900 p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors ${
                                schedule.is_active
                                    ? "border-gray-200 dark:border-gray-700"
                                    : "border-gray-200/50 dark:border-gray-700/50 opacity-60"
                            }`}
                        >
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
                                <Clock className="h-5 w-5" />
                                毎日 {String(schedule.schedule_hour).padStart(2, "0")}:00
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                    {schedule.content_type === "cast_list" && "出勤キャスト"}
                                    {schedule.content_type === "template" && "テンプレート"}
                                </span>
                                {schedule.platforms.map((p) => (
                                    <span
                                        key={p}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                    >
                                        X
                                    </span>
                                ))}
                            </div>
                        </button>
                    ))
                )}
            </div>

            {/* Recurring Schedule Modal */}
            <Dialog open={showRecurringModal} onOpenChange={handleModalClose}>
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
                            {editingRecurring ? "スケジュールを編集" : "スケジュールを作成"}
                        </DialogTitle>
                        {editingRecurring ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setDeletingId(editingRecurring.id);
                                    setShowDeleteConfirm(true);
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                aria-label="削除"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        ) : (
                            <div className="w-8" />
                        )}
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">スケジュール名</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="例: 出勤情報自動投稿"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">投稿内容</Label>
                            <Select value={contentType} onValueChange={(v: any) => setContentType(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cast_list">出勤キャスト一覧</SelectItem>
                                    <SelectItem value="template">テンプレート</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {contentType === "template" && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">テンプレート</Label>
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

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">投稿時間</Label>
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
                    <div className="flex-shrink-0 px-6 pb-6 space-y-2">
                        <Button
                            onClick={handleSaveRecurring}
                            disabled={isSubmitting || !name.trim() || !isXSelected}
                            className="w-full rounded-lg bg-blue-600 text-white hover:bg-blue-700"
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
                        <Button
                            variant="outline"
                            onClick={() => handleModalClose(false)}
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
                            スケジュールを削除
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        このスケジュールを削除しますか？
                    </p>
                    <DialogFooter className="flex-col gap-2">
                        <Button
                            variant="destructive"
                            onClick={handleDeleteRecurring}
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
