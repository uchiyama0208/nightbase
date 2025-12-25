"use client";

import { useState, useEffect } from "react";
import { Check, X, Loader2, Calendar, Clock, ChevronLeft } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMySubmissions, submitShiftPreferences } from "./actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

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
    shift_request_dates: ShiftRequestDate[];
}

interface StoreDefaults {
    default_cast_start_time: string | null;
    default_cast_end_time: string | null;
    default_staff_start_time: string | null;
    default_staff_end_time: string | null;
}

interface DatePreference {
    dateId: string;
    targetDate: string;
    availability: "available" | "unavailable" | null;
    startTime: string;
    endTime: string;
    note: string;
    status: "not_submitted" | "pending" | "approved" | "rejected";
}

interface SubmissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: ShiftRequest;
    profileId: string;
    profileRole: string;
    storeDefaults: StoreDefaults | null;
}

export function SubmissionModal({
    isOpen,
    onClose,
    request,
    profileId,
    profileRole,
    storeDefaults,
}: SubmissionModalProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [preferences, setPreferences] = useState<DatePreference[]>([]);

    // デフォルト時間を取得
    const getDefaultTimes = () => {
        if (profileRole === "cast") {
            return {
                start: storeDefaults?.default_cast_start_time?.slice(0, 5) || "20:00",
                end: storeDefaults?.default_cast_end_time?.slice(0, 5) || "01:00",
            };
        }
        return {
            start: storeDefaults?.default_staff_start_time?.slice(0, 5) || "19:00",
            end: storeDefaults?.default_staff_end_time?.slice(0, 5) || "02:00",
        };
    };

    useEffect(() => {
        if (isOpen) {
            loadExistingSubmissions();
        }
    }, [isOpen, request.id]);

    const loadExistingSubmissions = async () => {
        setIsLoading(true);
        try {
            const existingSubmissions = await getMySubmissions(profileId, request.id);
            const defaultTimes = getDefaultTimes();

            // 既存の提出があれば使用、なければデフォルト値で初期化
            const sortedDates = [...request.shift_request_dates].sort((a, b) =>
                a.target_date.localeCompare(b.target_date)
            );

            const prefs = sortedDates.map((date) => {
                const existing = existingSubmissions.find(
                    (s: any) => s.shift_request_date_id === date.id
                );

                if (existing) {
                    // ステータスを変換
                    let displayStatus: "not_submitted" | "pending" | "approved" | "rejected" = "pending";
                    if (existing.status === "pending") {
                        displayStatus = "pending";
                    } else if (existing.status === "rejected") {
                        displayStatus = "rejected";
                    } else if (["scheduled", "working", "completed"].includes(existing.status)) {
                        displayStatus = "approved";
                    }

                    return {
                        dateId: date.id,
                        targetDate: date.target_date,
                        availability: existing.availability as "available" | "unavailable",
                        startTime: existing.preferred_start_time?.slice(0, 5) || defaultTimes.start,
                        endTime: existing.preferred_end_time?.slice(0, 5) || defaultTimes.end,
                        note: existing.note || "",
                        status: displayStatus,
                    };
                }

                return {
                    dateId: date.id,
                    targetDate: date.target_date,
                    availability: null,
                    startTime: date.default_start_time?.slice(0, 5) || defaultTimes.start,
                    endTime: date.default_end_time?.slice(0, 5) || defaultTimes.end,
                    note: "",
                    status: "not_submitted" as const,
                };
            });

            setPreferences(prefs);
        } catch (error) {
            console.error("Failed to load submissions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const updatePreference = (
        dateId: string,
        field: keyof DatePreference,
        value: string
    ) => {
        setPreferences((prev) =>
            prev.map((p) =>
                p.dateId === dateId ? { ...p, [field]: value } : p
            )
        );
    };

    const setAvailability = (dateId: string, value: "available" | "unavailable") => {
        setPreferences((prev) =>
            prev.map((p) =>
                p.dateId === dateId
                    ? { ...p, availability: value }
                    : p
            )
        );
    };

    // ロックされていない日付がすべて選択されているかチェック
    const allSelected = preferences.every((p) =>
        p.status === "approved" || p.status === "rejected" || p.availability !== null
    );

    const handleSubmit = async () => {
        if (!allSelected) return;

        setIsSubmitting(true);
        try {
            // ロックされていない日付のみ送信
            const submittablePrefs = preferences.filter(
                (p) => p.status !== "approved" && p.status !== "rejected"
            );

            const result = await submitShiftPreferences(
                profileId,
                request.id,
                submittablePrefs.map((p) => ({
                    dateId: p.dateId,
                    availability: p.availability as "available" | "unavailable",
                    startTime: p.startTime,
                    endTime: p.endTime,
                    note: p.note,
                }))
            );

            if (result.success) {
                toast({ title: "シフト希望を提出しました" });
                router.refresh();
                onClose();
            } else {
                toast({ title: "提出に失敗しました", variant: "destructive" });
                console.error("Failed to submit:", result.error);
            }
        } catch (error) {
            console.error("Error submitting:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md w-[95%] p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl bg-white dark:bg-gray-900">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        シフト希望を提出
                    </DialogTitle>
                    <div className="w-8 h-8" />
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Request Info */}
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                                    {request.title}
                                </h3>
                                {request.description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                        {request.description}
                                    </p>
                                )}
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                        期限: {new Date(request.deadline).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                                    </span>
                                </div>
                            </div>

                            {/* Date Preferences */}
                            <div className="space-y-3">
                                {preferences.map((pref) => (
                                    <DatePreferenceItem
                                        key={pref.dateId}
                                        preference={pref}
                                        onSetAvailability={(value) => setAvailability(pref.dateId, value)}
                                        onUpdate={(field, value) =>
                                            updatePreference(pref.dateId, field, value)
                                        }
                                        isLocked={pref.status === "approved" || pref.status === "rejected"}
                                    />
                                ))}
                            </div>

                            {/* Submit Button */}
                            <Button
                                className="w-full"
                                onClick={handleSubmit}
                                disabled={isSubmitting || isLoading || !allSelected}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        送信中...
                                    </>
                                ) : (
                                    "希望を提出"
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function DatePreferenceItem({
    preference,
    onSetAvailability,
    onUpdate,
    isLocked,
}: {
    preference: DatePreference;
    onSetAvailability: (value: "available" | "unavailable") => void;
    onUpdate: (field: keyof DatePreference, value: string) => void;
    isLocked: boolean;
}) {
    const isAvailable = preference.availability === "available";
    const isUnavailable = preference.availability === "unavailable";
    const isUnselected = preference.availability === null;
    const formattedDate = formatDisplayDate(preference.targetDate);

    const getStatusBadge = () => {
        if (preference.status === "approved") {
            return (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    確定
                </span>
            );
        }
        if (preference.status === "rejected") {
            return (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    否認
                </span>
            );
        }
        if (preference.status === "pending") {
            return (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    提出済み
                </span>
            );
        }
        return null;
    };

    // 確定・否認の場合はロックされた表示
    if (isLocked) {
        return (
            <div
                className={`p-3 rounded-xl border transition-colors ${
                    preference.status === "approved"
                        ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                        : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
                }`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">
                            {formattedDate}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {preference.startTime && preference.endTime && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {preference.startTime} 〜 {preference.endTime}
                            </span>
                        )}
                        {getStatusBadge()}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`p-3 rounded-xl border transition-colors ${
                isAvailable
                    ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                    : isUnavailable
                    ? "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
            }`}
        >
            {/* Date */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                        {formattedDate}
                    </span>
                </div>
                {getStatusBadge()}
            </div>

            {/* Selection Buttons */}
            <div className="flex gap-2 mb-3">
                <button
                    type="button"
                    onClick={() => onSetAvailability("available")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isAvailable
                            ? "bg-green-600 text-white"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                >
                    <Check className="h-4 w-4" />
                    出勤希望
                </button>
                <button
                    type="button"
                    onClick={() => onSetAvailability("unavailable")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isUnavailable
                            ? "bg-gray-600 text-white dark:bg-gray-500"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                >
                    <X className="h-5 w-5" />
                    出勤不可
                </button>
            </div>

            {/* Time inputs (only when available) */}
            {isAvailable && (
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            出勤
                        </label>
                        <Input
                            type="time"
                            value={preference.startTime}
                            onChange={(e) => onUpdate("startTime", e.target.value)}
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
                            value={preference.endTime}
                            onChange={(e) => onUpdate("endTime", e.target.value)}
                            className="h-10"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function formatDisplayDate(dateStr: string): string {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
    return `${month}/${day}(${weekDays[date.getDay()]})`;
}
