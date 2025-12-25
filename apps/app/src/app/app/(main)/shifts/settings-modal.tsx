"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ChevronLeft } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useGlobalLoading } from "@/components/global-loading";
import { toast } from "@/components/ui/use-toast";
import { updateStoreShiftDefaults, getAutomationSettings, updateAutomationSettings } from "./actions";

interface StoreDefaults {
    default_cast_start_time: string | null;
    default_cast_end_time: string | null;
    default_staff_start_time: string | null;
    default_staff_end_time: string | null;
}

interface AutomationSettings {
    enabled: boolean;
    target_roles: string[];
    period_type: "week" | "half_month" | "month";
    send_day_offset: number;
    send_hour: number;
    reminder_enabled: boolean;
    reminder_day_offset: number;
    reminder_hour: number;
}

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
    storeDefaults: StoreDefaults | null;
}

export function SettingsModal({
    isOpen,
    onClose,
    storeId,
    storeDefaults,
}: SettingsModalProps) {
    const queryClient = useQueryClient();
    const { showLoading, hideLoading } = useGlobalLoading();
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"basic" | "automation">("basic");
    const isInitializedRef = useRef(false);
    const [hasUserEdited, setHasUserEdited] = useState(false);
    const autoSaveRef = useRef<(() => Promise<void>) | undefined>(undefined);

    // Basic settings
    const [castStartTime, setCastStartTime] = useState(
        storeDefaults?.default_cast_start_time?.slice(0, 5) || "20:00"
    );
    const [castEndTime, setCastEndTime] = useState(
        storeDefaults?.default_cast_end_time?.slice(0, 5) || "01:00"
    );
    const [staffStartTime, setStaffStartTime] = useState(
        storeDefaults?.default_staff_start_time?.slice(0, 5) || "19:00"
    );
    const [staffEndTime, setStaffEndTime] = useState(
        storeDefaults?.default_staff_end_time?.slice(0, 5) || "02:00"
    );

    // Automation settings
    const [automationEnabled, setAutomationEnabled] = useState(false);
    const [targetRoles, setTargetRoles] = useState<string[]>(["cast", "staff"]);
    const [periodType, setPeriodType] = useState<"week" | "half_month" | "month">("week");
    const [sendDayOffset, setSendDayOffset] = useState(7);
    const [sendHour, setSendHour] = useState(10);
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [reminderDayOffset, setReminderDayOffset] = useState(1);
    const [reminderHour, setReminderHour] = useState(10);

    useEffect(() => {
        if (isOpen) {
            setHasUserEdited(false);
            loadAutomationSettings();
        }
    }, [isOpen]);

    const loadAutomationSettings = async () => {
        setIsLoading(true);
        try {
            const settings = await getAutomationSettings(storeId);
            if (settings) {
                setAutomationEnabled(settings.enabled);
                setTargetRoles(settings.target_roles || ["cast", "staff"]);
                setPeriodType(settings.period_type || "week");
                setSendDayOffset(settings.send_day_offset || 7);
                setSendHour(settings.send_hour || 10);
                setReminderEnabled(settings.reminder_enabled || false);
                setReminderDayOffset(settings.reminder_day_offset || 1);
                setReminderHour(settings.reminder_hour || 10);
            }
        } catch (error) {
            console.error("Failed to load automation settings:", error);
        } finally {
                setIsLoading(false);
            isInitializedRef.current = true;
        }
    };

    // Auto-save function
    const autoSave = useCallback(async () => {
        if (!isInitializedRef.current) return;

        showLoading("保存中...");
        try {
            // Update basic settings
            const basicResult = await updateStoreShiftDefaults(storeId, {
                default_cast_start_time: castStartTime,
                default_cast_end_time: castEndTime,
                default_staff_start_time: staffStartTime,
                default_staff_end_time: staffEndTime,
            });

            // Update automation settings
            const automationResult = await updateAutomationSettings(storeId, {
                enabled: automationEnabled,
                target_roles: targetRoles,
                period_type: periodType,
                send_day_offset: sendDayOffset,
                send_hour: sendHour,
                reminder_enabled: reminderEnabled,
                reminder_day_offset: reminderDayOffset,
                reminder_hour: reminderHour,
            });

            if (basicResult.success && automationResult.success) {
                await queryClient.invalidateQueries({ queryKey: ["shifts"] });
            } else {
                toast({
                    title: "エラー",
                    description: "設定の保存に失敗しました",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error updating settings:", error);
            toast({
                title: "エラー",
                description: "設定の保存に失敗しました",
                variant: "destructive",
            });
        } finally {
            hideLoading();
        }
    }, [
        storeId,
        castStartTime,
        castEndTime,
        staffStartTime,
        staffEndTime,
        automationEnabled,
        targetRoles,
        periodType,
        sendDayOffset,
        sendHour,
        reminderEnabled,
        reminderDayOffset,
        reminderHour,
        queryClient,
        showLoading,
        hideLoading,
    ]);

    // Update autoSaveRef when autoSave changes
    useEffect(() => {
        autoSaveRef.current = autoSave;
    }, [autoSave]);

    // Debounced auto-save effect
    useEffect(() => {
        if (!isInitializedRef.current || !hasUserEdited) return;

        const timeoutId = setTimeout(() => {
            autoSaveRef.current?.();
        }, 800);

        return () => clearTimeout(timeoutId);
    }, [
        hasUserEdited,
        castStartTime,
        castEndTime,
        staffStartTime,
        staffEndTime,
        automationEnabled,
        targetRoles,
        periodType,
        sendDayOffset,
        sendHour,
        reminderEnabled,
        reminderDayOffset,
        reminderHour,
    ]);

    const tabIndex = activeTab === "basic" ? 0 : 1;

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    setHasUserEdited(false);
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-lg p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        シフト設定
                    </DialogTitle>
                    <div className="w-8 h-8" />
                </DialogHeader>

                {/* Tab Switcher */}
                <div className="px-4 pt-4">
                    <div className="relative inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 w-full">
                        <div
                            className="absolute h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-transform duration-300 ease-in-out"
                            style={{
                                width: "calc(50% - 4px)",
                                left: "4px",
                                transform: `translateX(${tabIndex * 100}%)`,
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setActiveTab("basic")}
                            className={`relative z-10 flex-1 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${
                                activeTab === "basic"
                                    ? "text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400"
                            }`}
                        >
                            基本設定
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("automation")}
                            className={`relative z-10 flex-1 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${
                                activeTab === "automation"
                                    ? "text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400"
                            }`}
                        >
                            自動化
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : activeTab === "basic" ? (
                        <div className="space-y-6">
                            {/* Cast Default Times */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                    キャストのデフォルト出勤時間
                                </h3>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                            出勤
                                        </label>
                                        <Input
                                            type="time"
                                            value={castStartTime}
                                            onChange={(e) => {
                                                setCastStartTime(e.target.value);
                                                setHasUserEdited(true);
                                            }}
                                            className="h-10"
                                        />
                                    </div>
                                    <span className="text-gray-400 mt-5">〜</span>
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                            退勤
                                        </label>
                                        <Input
                                            type="time"
                                            value={castEndTime}
                                            onChange={(e) => {
                                                setCastEndTime(e.target.value);
                                                setHasUserEdited(true);
                                            }}
                                            className="h-10"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Staff Default Times */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                    スタッフのデフォルト出勤時間
                                </h3>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                            出勤
                                        </label>
                                        <Input
                                            type="time"
                                            value={staffStartTime}
                                            onChange={(e) => {
                                                setStaffStartTime(e.target.value);
                                                setHasUserEdited(true);
                                            }}
                                            className="h-10"
                                        />
                                    </div>
                                    <span className="text-gray-400 mt-5">〜</span>
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                            退勤
                                        </label>
                                        <Input
                                            type="time"
                                            value={staffEndTime}
                                            onChange={(e) => {
                                                setStaffEndTime(e.target.value);
                                                setHasUserEdited(true);
                                            }}
                                            className="h-10"
                                        />
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                ここで設定した時間がシフト募集作成時のデフォルト値になります。
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Automation Enable */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        シフト募集の自動化
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        設定したタイミングで自動的にLINEでシフト募集を送信します
                                    </p>
                                </div>
                                <Switch
                                    checked={automationEnabled}
                                    onCheckedChange={(checked) => {
                                        setAutomationEnabled(checked);
                                        setHasUserEdited(true);
                                    }}
                                />
                            </div>

                            {automationEnabled && (
                                <>
                                    {/* Target Roles */}
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                            送信対象
                                        </h3>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={targetRoles.includes("cast")}
                                                    onCheckedChange={(checked) => {
                                                        setTargetRoles((prev) =>
                                                            checked
                                                                ? [...prev, "cast"]
                                                                : prev.filter((r) => r !== "cast")
                                                        );
                                                        setHasUserEdited(true);
                                                    }}
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    キャスト
                                                </span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={targetRoles.includes("staff")}
                                                    onCheckedChange={(checked) => {
                                                        setTargetRoles((prev) =>
                                                            checked
                                                                ? [...prev, "staff"]
                                                                : prev.filter((r) => r !== "staff")
                                                        );
                                                        setHasUserEdited(true);
                                                    }}
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    スタッフ
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Period Type */}
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                            募集期間
                                        </h3>
                                        <Select
                                            value={periodType}
                                            onValueChange={(v) => {
                                                setPeriodType(v as typeof periodType);
                                                setHasUserEdited(true);
                                            }}
                                        >
                                            <SelectTrigger className="h-10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="week">1週間（月曜スタート）</SelectItem>
                                                <SelectItem value="half_month">半月（1-15日 / 16日-末日）</SelectItem>
                                                <SelectItem value="month">1ヶ月（1日スタート）</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Send Timing */}
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                            送信タイミング
                                        </h3>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                    期間開始の
                                                </label>
                                                <Select
                                                    value={String(sendDayOffset)}
                                                    onValueChange={(v) => {
                                                        setSendDayOffset(Number(v));
                                                        setHasUserEdited(true);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-10">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
                                                            <SelectItem key={d} value={String(d)}>
                                                                {d === 0 ? "当日" : `${d}日前`}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                    送信時刻
                                                </label>
                                                <Select
                                                    value={String(sendHour)}
                                                    onValueChange={(v) => {
                                                        setSendHour(Number(v));
                                                        setHasUserEdited(true);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-10">
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
                                        </div>
                                    </div>

                                    {/* Reminder */}
                                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                    自動催促
                                                </h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    提出期限前に未提出者へリマインドを送信
                                                </p>
                                            </div>
                                            <Switch
                                                checked={reminderEnabled}
                                                onCheckedChange={(checked) => {
                                                    setReminderEnabled(checked);
                                                    setHasUserEdited(true);
                                                }}
                                            />
                                        </div>

                                        {reminderEnabled && (
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                        期限の
                                                    </label>
                                                    <Select
                                                        value={String(reminderDayOffset)}
                                                        onValueChange={(v) => {
                                                            setReminderDayOffset(Number(v));
                                                            setHasUserEdited(true);
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-10">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
                                                                <SelectItem key={d} value={String(d)}>
                                                                    {d === 0 ? "当日" : `${d}日前`}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                        送信時刻
                                                    </label>
                                                    <Select
                                                        value={String(reminderHour)}
                                                        onValueChange={(v) => {
                                                            setReminderHour(Number(v));
                                                            setHasUserEdited(true);
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-10">
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
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
