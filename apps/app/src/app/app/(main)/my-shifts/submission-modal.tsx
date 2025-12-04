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
                    return {
                        dateId: date.id,
                        targetDate: date.target_date,
                        availability: existing.availability as "available" | "unavailable",
                        startTime: existing.preferred_start_time?.slice(0, 5) || defaultTimes.start,
                        endTime: existing.preferred_end_time?.slice(0, 5) || defaultTimes.end,
                        note: existing.note || "",
                    };
                }

                return {
                    dateId: date.id,
                    targetDate: date.target_date,
                    availability: null,
                    startTime: date.default_start_time?.slice(0, 5) || defaultTimes.start,
                    endTime: date.default_end_time?.slice(0, 5) || defaultTimes.end,
                    note: "",
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

    const allSelected = preferences.every((p) => p.availability !== null);

    const handleSubmit = async () => {
        if (!allSelected) return;

        setIsSubmitting(true);
        try {
            const result = await submitShiftPreferences(
                profileId,
                request.id,
                preferences.map((p) => ({
                    dateId: p.dateId,
                    availability: p.availability as "available" | "unavailable",
                    startTime: p.startTime,
                    endTime: p.endTime,
                    note: p.note,
                }))
            );

            if (result.success) {
                router.refresh();
                onClose();
            } else {
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
            <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                <DialogHeader className="flex flex-row items-center border-b px-4 py-3 flex-shrink-0 mb-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 mr-2"
                    >
                        <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                        シフト希望を提出
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 min-h-0">
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
}: {
    preference: DatePreference;
    onSetAvailability: (value: "available" | "unavailable") => void;
    onUpdate: (field: keyof DatePreference, value: string) => void;
}) {
    const isAvailable = preference.availability === "available";
    const isUnavailable = preference.availability === "unavailable";
    const isUnselected = preference.availability === null;
    const formattedDate = formatDisplayDate(preference.targetDate);

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
            <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white">
                    {formattedDate}
                </span>
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
                    <X className="h-4 w-4" />
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
                            className="h-9"
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
                            className="h-9"
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
