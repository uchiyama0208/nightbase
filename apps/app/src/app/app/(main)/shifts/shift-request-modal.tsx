"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Check, Calendar, Users, Clock, Loader2, Send } from "lucide-react";
import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { createShiftRequest, getLineTargetProfiles, sendLineNotification, checkExistingRequestConflicts } from "./actions";
import { LineWarningModal } from "./line-warning-modal";
import { useRouter } from "next/navigation";

interface Profile {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    role: string;
    line_user_id: string | null;
    status: string | null;
}

interface StoreDefaults {
    default_cast_start_time: string | null;
    default_cast_end_time: string | null;
    default_staff_start_time: string | null;
    default_staff_end_time: string | null;
}

interface ShiftRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    profiles: Profile[];
    storeId: string;
    profileId: string;
    storeDefaults: StoreDefaults | null;
    storeName?: string;
    existingDates?: string[];
    closedDays?: string[];
}

type Step = "role" | "members" | "dates" | "warnings" | "times" | "deadline" | "confirm";

interface DateConfig {
    date: string;
    startTime: string;
    endTime: string;
}

export function ShiftRequestModal({
    isOpen,
    onClose,
    profiles,
    storeId,
    profileId,
    storeDefaults,
    storeName = "店舗",
    existingDates = [],
    closedDays = [],
}: ShiftRequestModalProps) {
    const router = useRouter();
    const [step, setStep] = useState<Step>("role");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSendingLine, setIsSendingLine] = useState(false);
    const [showLineWarning, setShowLineWarning] = useState(false);
    const [lineTargetInfo, setLineTargetInfo] = useState<{
        linkedProfiles: { id: string; display_name: string | null; avatar_url: string | null; role: string; line_user_id: string | null }[];
        unlinkedProfiles: { id: string; display_name: string | null; avatar_url: string | null; role: string; line_user_id: string | null }[];
    } | null>(null);
    const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
    const [showLineSendConfirm, setShowLineSendConfirm] = useState(false);

    // Form state
    const [deadlineDaysBefore, setDeadlineDaysBefore] = useState(3);
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [targetRole, setTargetRole] = useState<"cast" | "staff" | null>(null);
    const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
    const [useAllActiveProfiles, setUseAllActiveProfiles] = useState(false);
    const [showMemberList, setShowMemberList] = useState(false);
    const [dateConfigs, setDateConfigs] = useState<DateConfig[]>([]);

    // Warning state
    const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
    const [conflictingProfiles, setConflictingProfiles] = useState<{
        profileId: string;
        dates: string[];
    }[]>([]);
    const [selectedClosedDays, setSelectedClosedDays] = useState<string[]>([]);

    // Calendar state
    const [calendarDate, setCalendarDate] = useState(new Date());
    const calendarYear = calendarDate.getFullYear();
    const calendarMonth = calendarDate.getMonth();

    const defaultStartTime = storeDefaults?.default_cast_start_time?.slice(0, 5) || "20:00";
    const defaultEndTime = storeDefaults?.default_cast_end_time?.slice(0, 5) || "01:00";

    // Filter profiles by target role (all profiles for individual selection)
    const filteredProfiles = useMemo(() => {
        if (!targetRole) return [];
        return profiles.filter((p) => {
            if (targetRole === "staff" && (p.role === "staff" || p.role === "admin")) {
                return true;
            }
            if (targetRole === "cast" && p.role === "cast") {
                return true;
            }
            return false;
        });
    }, [profiles, targetRole]);

    // Filter profiles by status "在籍中" for "all active members" option
    const activeProfiles = useMemo(() => {
        return filteredProfiles.filter((p) => {
            // 在籍中 or null/undefined (未設定はデフォルトで在籍中とみなす)
            return !p.status || p.status === "在籍中";
        });
    }, [filteredProfiles]);

    // シフト開始日（選択した日付の中で一番直近の日付）
    const shiftStartDate = useMemo(() => {
        if (selectedDates.length === 0) return null;
        const sorted = [...selectedDates].sort();
        return sorted[0];
    }, [selectedDates]);

    // 締切日を計算（シフト開始日の○日前の23:59）
    const calculateDeadline = (daysBefore: number) => {
        if (!shiftStartDate) return "";
        const [year, month, day] = shiftStartDate.split("-").map(Number);
        const startDate = new Date(year, month - 1, day);
        startDate.setDate(startDate.getDate() - daysBefore);
        startDate.setHours(23, 59, 0, 0);
        // datetime-local形式に変換
        const y = startDate.getFullYear();
        const m = String(startDate.getMonth() + 1).padStart(2, "0");
        const d = String(startDate.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}T23:59`;
    };

    const deadline = calculateDeadline(deadlineDaysBefore);

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const firstDay = new Date(calendarYear, calendarMonth, 1);
        const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
        const startingDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        const days: (number | null)[] = [];
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }
        return days;
    }, [calendarYear, calendarMonth]);

    const formatDateKey = (day: number) => {
        const m = String(calendarMonth + 1).padStart(2, "0");
        const d = String(day).padStart(2, "0");
        return `${calendarYear}-${m}-${d}`;
    };

    const toggleDate = (dateKey: string) => {
        setSelectedDates((prev) =>
            prev.includes(dateKey)
                ? prev.filter((d) => d !== dateKey)
                : [...prev, dateKey].sort()
        );
    };

    const handleNext = async () => {
        if (step === "role") {
            setStep("members");
        } else if (step === "members") {
            setStep("dates");
        } else if (step === "dates") {
            // 日付選択後に警告チェック
            setIsCheckingConflicts(true);

            // 店休日の確認
            const weekDayNames = ["日", "月", "火", "水", "木", "金", "土"];
            const weekDayMappingLocal: Record<string, string> = {
                sunday: "日", monday: "月", tuesday: "火", wednesday: "水",
                thursday: "木", friday: "金", saturday: "土",
            };
            const closedDaysJPLocal = closedDays.map((d) => weekDayMappingLocal[d.toLowerCase()] || d);
            const closedDatesSelected = selectedDates.filter((dateStr) => {
                const [year, month, day] = dateStr.split("-").map(Number);
                const date = new Date(year, month - 1, day);
                const dayName = weekDayNames[date.getDay()];
                return closedDaysJPLocal.includes(dayName);
            });
            setSelectedClosedDays(closedDatesSelected);

            // 重複メンバーの確認
            const result = await checkExistingRequestConflicts(
                storeId,
                selectedProfileIds,
                selectedDates
            );
            setConflictingProfiles(result.conflicts);
            setIsCheckingConflicts(false);

            // 警告がある場合は警告ステップへ、ない場合は時間設定へ
            if (closedDatesSelected.length > 0 || result.conflicts.length > 0) {
                setStep("warnings");
            } else {
                const configs = selectedDates.map((date) => ({
                    date,
                    startTime: defaultStartTime,
                    endTime: defaultEndTime,
                }));
                setDateConfigs(configs);
                setStep("times");
            }
        } else if (step === "warnings") {
            const configs = selectedDates.map((date) => ({
                date,
                startTime: defaultStartTime,
                endTime: defaultEndTime,
            }));
            setDateConfigs(configs);
            setStep("times");
        } else if (step === "times") {
            setStep("deadline");
        } else if (step === "deadline") {
            setStep("confirm");
        }
    };

    const handleBack = () => {
        if (step === "members") {
            if (showMemberList) {
                setShowMemberList(false);
            } else {
                setStep("role");
            }
        }
        else if (step === "dates") setStep("members");
        else if (step === "warnings") setStep("dates");
        else if (step === "times") setStep("dates");
        else if (step === "deadline") setStep("times");
        else if (step === "confirm") setStep("deadline");
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // 自動タイトル生成（最初の日付から）
            const firstDate = dateConfigs[0]?.date;
            const autoTitle = firstDate
                ? `${formatDisplayDate(firstDate)}〜 シフト募集`
                : "シフト募集";

            const result = await createShiftRequest({
                storeId,
                profileId,
                title: autoTitle,
                deadline: new Date(deadline).toISOString(),
                targetRoles: [targetRole!],
                targetProfileIds: selectedProfileIds,
                dates: dateConfigs,
            });

            if (result.success && result.requestId) {
                setCreatedRequestId(result.requestId);
                // LINE送信対象を確認
                const targetInfo = await getLineTargetProfiles(
                    storeId,
                    [targetRole!],
                    selectedProfileIds
                );
                setLineTargetInfo({
                    linkedProfiles: targetInfo.linkedProfiles || [],
                    unlinkedProfiles: targetInfo.unlinkedProfiles || [],
                });
                setIsSubmitting(false);
                setShowLineSendConfirm(true);
            } else {
                console.error("Failed to create shift request:", result.error);
                setIsSubmitting(false);
            }
        } catch (error) {
            console.error("Error creating shift request:", error);
            setIsSubmitting(false);
        }
    };

    const handleLineSendConfirm = async (send: boolean) => {
        if (send && createdRequestId && lineTargetInfo) {
            const linkedCount = lineTargetInfo.linkedProfiles.length;
            const unlinkedCount = lineTargetInfo.unlinkedProfiles.length;

            if (unlinkedCount > 0) {
                // 未連携ユーザーがいる場合は警告を表示
                setShowLineSendConfirm(false);
                setShowLineWarning(true);
            } else if (linkedCount > 0) {
                // 全員連携済みの場合はそのまま送信
                await sendLineAndClose(createdRequestId);
            } else {
                // 誰も連携していない場合
                router.refresh();
                onClose();
            }
        } else {
            // 送信しない場合
            router.refresh();
            onClose();
        }
    };

    const sendLineAndClose = async (requestId: string) => {
        setIsSendingLine(true);
        try {
            await sendLineNotification(requestId, storeName);
            router.refresh();
            onClose();
        } catch (error) {
            console.error("Error sending LINE:", error);
        } finally {
            setIsSendingLine(false);
            setIsSubmitting(false);
        }
    };

    const handleLineWarningConfirm = async () => {
        if (createdRequestId) {
            setShowLineWarning(false);
            await sendLineAndClose(createdRequestId);
        }
    };

    const updateDateConfig = (date: string, field: "startTime" | "endTime", value: string) => {
        setDateConfigs((prev) =>
            prev.map((c) => (c.date === date ? { ...c, [field]: value } : c))
        );
    };

    const canProceed = () => {
        if (step === "role") return targetRole !== null;
        if (step === "members") return selectedProfileIds.length > 0;
        if (step === "dates") return selectedDates.length > 0;
        if (step === "warnings") return true;
        if (step === "times") return dateConfigs.every((c) => c.startTime && c.endTime);
        if (step === "deadline") return deadlineDaysBefore >= 1 && deadlineDaysBefore <= 7;
        return true;
    };

    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekDayMapping: Record<string, string> = {
        sunday: "日",
        monday: "月",
        tuesday: "火",
        wednesday: "水",
        thursday: "木",
        friday: "金",
        saturday: "土",
    };
    const closedDaysJP = closedDays.map((d) => weekDayMapping[d.toLowerCase()] || d);
    const today = new Date();

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                    <DialogHeader className="flex flex-row items-center border-b px-4 py-3 flex-shrink-0 mb-0">
                        {step !== "role" && (
                            <button
                                type="button"
                                onClick={handleBack}
                                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 mr-2"
                            >
                                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </button>
                        )}
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                            {step === "role" && "シフト募集を作成"}
                            {step === "members" && "対象メンバーを選択"}
                            {step === "dates" && "対象日付を選択"}
                            {step === "warnings" && "確認事項"}
                            {step === "times" && "出勤時間を設定"}
                            {step === "deadline" && "提出期限を設定"}
                            {step === "confirm" && "内容を確認"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 min-h-0">
                        {/* Step 1: Role Selection */}
                        {step === "role" && (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    シフト募集の対象を選択してください
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTargetRole("cast");
                                            setStep("members");
                                        }}
                                        className="p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                    >
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                                <Users className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    キャスト
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    キャスト向け募集
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTargetRole("staff");
                                            setStep("members");
                                        }}
                                        className="p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                    >
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                                <Clock className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    スタッフ
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    スタッフ向け募集
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Date Selection */}
                        {step === "dates" && (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    シフト募集する日付を選択してください
                                </p>

                                {/* Mini Calendar */}
                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800">
                                        <button
                                            type="button"
                                            onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))}
                                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {calendarYear}年{calendarMonth + 1}月
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))}
                                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-7 text-center text-xs text-gray-500 dark:text-gray-400 py-1 border-b border-gray-200 dark:border-gray-700">
                                        {weekDays.map((d, i) => (
                                            <div key={d} className={i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""}>
                                                {d}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7">
                                        {calendarDays.map((day, index) => {
                                            if (day === null) {
                                                return <div key={`empty-${index}`} className="h-10" />;
                                            }
                                            const dateKey = formatDateKey(day);
                                            const isSelected = selectedDates.includes(dateKey);
                                            const isPast = new Date(dateKey) < new Date(today.toDateString());
                                            const dayOfWeek = new Date(calendarYear, calendarMonth, day).getDay();
                                            const dayName = weekDays[dayOfWeek];
                                            const isClosedDay = closedDaysJP.includes(dayName);

                                            return (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    onClick={() => !isPast && toggleDate(dateKey)}
                                                    disabled={isPast}
                                                    className={`h-10 text-sm transition-colors relative ${
                                                        isPast
                                                            ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                                            : isSelected
                                                            ? "bg-blue-600 text-white"
                                                            : isClosedDay
                                                            ? "text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800/50"
                                                            : dayOfWeek === 0
                                                            ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            : dayOfWeek === 6
                                                            ? "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                    }`}
                                                >
                                                    {day}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Legends */}
                                {closedDaysJP.length > 0 && (
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <span className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700" />
                                        <span>店休日（{closedDaysJP.join("・")}）</span>
                                    </div>
                                )}

                                {/* Selected Dates */}
                                {selectedDates.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                            選択中: {selectedDates.length}日
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedDates.map((date) => (
                                                <span
                                                    key={date}
                                                    className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full"
                                                >
                                                    {formatDisplayDate(date)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 2: Member Selection */}
                        {step === "members" && (
                            <div className="space-y-4">
                                {!showMemberList ? (
                                    <>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            対象メンバーを選択してください
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setUseAllActiveProfiles(true);
                                                    setSelectedProfileIds(activeProfiles.map((p) => p.id));
                                                    setStep("dates");
                                                }}
                                                className="p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                            >
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                                        <Users className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            在籍中の全員
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            {activeProfiles.length}名
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setUseAllActiveProfiles(false);
                                                    setShowMemberList(true);
                                                }}
                                                className="p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                            >
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                                        <Check className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            個別
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            個別に選択
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            送信するメンバーを選択してください
                                        </p>
                                        <div className="space-y-2 max-h-[350px] overflow-y-auto">
                                            {filteredProfiles.map((profile) => (
                                                <label
                                                    key={profile.id}
                                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                                >
                                                    <Checkbox
                                                        checked={selectedProfileIds.includes(profile.id)}
                                                        onCheckedChange={(checked) => {
                                                            setSelectedProfileIds((prev) =>
                                                                checked
                                                                    ? [...prev, profile.id]
                                                                    : prev.filter((id) => id !== profile.id)
                                                            );
                                                        }}
                                                    />
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
                                                </label>
                                            ))}
                                        </div>
                                        {selectedProfileIds.length > 0 && (
                                            <p className="text-sm text-blue-600 dark:text-blue-400">
                                                {selectedProfileIds.length}名を選択中
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Step 4: Warnings */}
                        {step === "warnings" && (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    以下の点をご確認ください
                                </p>

                                {/* 店休日の警告 */}
                                {selectedClosedDays.length > 0 && (
                                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center">
                                                <span className="text-amber-600 dark:text-amber-300 text-lg">⚠️</span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                                    店休日が含まれています
                                                </p>
                                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                                    以下の日付は店休日に設定されています：
                                                </p>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {selectedClosedDays.map((date) => (
                                                        <span
                                                            key={date}
                                                            className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200 rounded-full"
                                                        >
                                                            {formatDisplayDate(date)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 重複メンバーの警告 */}
                                {conflictingProfiles.length > 0 && (
                                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                                                <span className="text-blue-600 dark:text-blue-300 text-lg">ℹ️</span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                                    既に募集対象のメンバーがいます
                                                </p>
                                                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                                    以下のメンバーは選択した日付で既に他の募集対象になっています：
                                                </p>
                                                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                                                    {conflictingProfiles.map((conflict) => {
                                                        const profile = profiles.find((p) => p.id === conflict.profileId);
                                                        return (
                                                            <div key={conflict.profileId} className="flex items-center gap-2">
                                                                {profile?.avatar_url ? (
                                                                    <Image
                                                                        src={profile.avatar_url}
                                                                        alt=""
                                                                        width={24}
                                                                        height={24}
                                                                        className="h-6 w-6 rounded-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="h-6 w-6 rounded-full bg-blue-200 dark:bg-blue-700" />
                                                                )}
                                                                <span className="text-sm text-blue-800 dark:text-blue-200">
                                                                    {profile?.display_name || "名前なし"}
                                                                </span>
                                                                <span className="text-xs text-blue-600 dark:text-blue-400">
                                                                    ({conflict.dates.map(formatDisplayDate).join(", ")})
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                    問題なければ「次へ」を押して続行してください
                                </p>
                            </div>
                        )}

                        {/* Step 5: Time Settings */}
                        {step === "times" && (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    各日付のデフォルト出勤時間を設定してください
                                </p>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                    {dateConfigs.map((config) => (
                                        <div
                                            key={config.date}
                                            className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800"
                                        >
                                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                                {formatDisplayDate(config.date)}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="time"
                                                    value={config.startTime}
                                                    onChange={(e) => updateDateConfig(config.date, "startTime", e.target.value)}
                                                    className="h-9 w-28"
                                                />
                                                <span className="text-gray-500">〜</span>
                                                <Input
                                                    type="time"
                                                    value={config.endTime}
                                                    onChange={(e) => updateDateConfig(config.date, "endTime", e.target.value)}
                                                    className="h-9 w-28"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 6: Deadline */}
                        {step === "deadline" && (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    シフト希望の提出期限を設定してください
                                </p>

                                {shiftStartDate && (
                                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-sm">
                                        <p className="text-blue-700 dark:text-blue-300">
                                            シフト開始日: <span className="font-medium">{formatDisplayDate(shiftStartDate)}</span>
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        開始日の何日前まで？
                                    </p>
                                    <div className="grid grid-cols-7 gap-2">
                                        {[7, 6, 5, 4, 3, 2, 1].map((days) => (
                                            <button
                                                key={days}
                                                type="button"
                                                onClick={() => setDeadlineDaysBefore(days)}
                                                className={`p-3 rounded-xl text-center transition-all ${
                                                    deadlineDaysBefore === days
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                                }`}
                                            >
                                                <span className="text-lg font-bold">{days}</span>
                                                <span className="block text-xs mt-0.5">日前</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {deadline && (
                                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                                        <p className="text-gray-500 dark:text-gray-400">提出期限</p>
                                        <p className="text-gray-900 dark:text-white font-medium">
                                            {new Date(deadline).toLocaleString("ja-JP", {
                                                timeZone: "Asia/Tokyo",
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                                weekday: "short",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 6: Confirmation */}
                        {step === "confirm" && (
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">対象</p>
                                        <p className="text-sm text-gray-900 dark:text-white">
                                            {targetRole === "cast" ? "キャスト" : "スタッフ"}
                                            {useAllActiveProfiles ? `（在籍中の全員 ${selectedProfileIds.length}名）` : `（${selectedProfileIds.length}名）`}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">提出期限</p>
                                        <p className="text-sm text-gray-900 dark:text-white">
                                            {new Date(deadline).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">対象日付</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {dateConfigs.map((c) => (
                                                <span
                                                    key={c.date}
                                                    className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full"
                                                >
                                                    {formatDisplayDate(c.date)} {c.startTime}〜{c.endTime}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t px-4 py-3 flex justify-end gap-2 flex-shrink-0">
                        {step === "confirm" ? (
                            <div className="flex gap-2 w-full">
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-white dark:bg-gray-800"
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="flex-1"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            作成中...
                                        </>
                                    ) : (
                                        "作成"
                                    )}
                                </Button>
                            </div>
                        ) : step !== "role" && !(step === "members" && !showMemberList) ? (
                            <Button onClick={handleNext} disabled={!canProceed() || isCheckingConflicts}>
                                {isCheckingConflicts ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        確認中...
                                    </>
                                ) : (
                                    <>
                                        次へ
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </>
                                )}
                            </Button>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>

            {/* LINE Send Confirmation Dialog */}
            {showLineSendConfirm && (
                <Dialog open={showLineSendConfirm} onOpenChange={() => {}}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="text-gray-900 dark:text-white">
                                シフト募集を作成しました
                            </DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            対象メンバーにLINEで通知しますか？
                        </p>
                        <div className="flex flex-col gap-2 mt-4">
                            <Button
                                onClick={() => handleLineSendConfirm(true)}
                                disabled={isSendingLine}
                                className="w-full bg-green-600 hover:bg-green-700"
                            >
                                {isSendingLine ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        送信中...
                                    </>
                                ) : (
                                    "Nightbase公式LINEでまとめて通知"
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    const firstDate = dateConfigs[0]?.date;
                                    const message = `シフト募集のお知らせです。\n\n対象期間: ${firstDate ? formatDisplayDate(firstDate) : ""}〜\n提出期限: ${new Date(deadline).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}\n\nアプリからシフト希望を提出してください。`;
                                    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(message)}`, '_blank');
                                }}
                                disabled={isSendingLine}
                                className="w-full"
                            >
                                LINEで共有
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => handleLineSendConfirm(false)}
                                disabled={isSendingLine}
                                className="w-full"
                            >
                                送信しない
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* LINE Warning Modal */}
            {showLineWarning && lineTargetInfo && (
                <LineWarningModal
                    isOpen={showLineWarning}
                    onClose={() => {
                        setShowLineWarning(false);
                        router.refresh();
                        onClose();
                    }}
                    onConfirm={handleLineWarningConfirm}
                    unlinkedProfiles={lineTargetInfo.unlinkedProfiles}
                    linkedCount={lineTargetInfo.linkedProfiles.length}
                    isLoading={isSendingLine}
                />
            )}
        </>
    );
}

function formatDisplayDate(dateStr: string): string {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
    return `${month}/${day}(${weekDays[date.getDay()]})`;
}
