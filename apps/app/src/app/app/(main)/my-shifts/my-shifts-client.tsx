"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Calendar, Clock, AlertCircle, ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { updateReservationType } from "./actions";

const SubmissionModal = dynamic(
    () => import("./submission-modal").then((mod) => ({ default: mod.SubmissionModal })),
    { loading: () => null, ssr: false }
);

interface ShiftRequestDate {
    id: string;
    target_date: string;
    default_start_time: string | null;
    default_end_time: string | null;
}

interface ShiftRequest {
    id: string;
    store_id: string;
    title: string;
    description: string | null;
    deadline: string;
    status: string;
    target_roles: string[];
    shift_request_dates: ShiftRequestDate[];
}

interface StoreDefaults {
    default_cast_start_time: string | null;
    default_cast_end_time: string | null;
    default_staff_start_time: string | null;
    default_staff_end_time: string | null;
}

interface ApprovedShift {
    id: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    status?: "approved" | "pending" | "rejected";
    reservationType?: "douhan" | "shimei" | "none" | null;
    guestName?: string | null;
}

interface MyShiftsClientProps {
    shiftRequests: ShiftRequest[];
    profileId: string;
    profileRole: string;
    storeDefaults: StoreDefaults | null;
    approvedShifts: ApprovedShift[];
    submittedRequestIds: string[];
}

export function MyShiftsClient({
    shiftRequests,
    profileId,
    profileRole,
    storeDefaults,
    approvedShifts,
    submittedRequestIds,
}: MyShiftsClientProps) {
    const [selectedRequest, setSelectedRequest] = useState<ShiftRequest | null>(null);
    const [viewMode, setViewMode] = useState<"shifts" | "calendar">("calendar");
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    // Vercel-style tabs
    const viewTabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const [viewIndicatorStyle, setViewIndicatorStyle] = useState({ left: 0, width: 0 });

    useEffect(() => {
        const activeButton = viewTabsRef.current[viewMode];
        if (activeButton) {
            setViewIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
            });
        }
    }, [viewMode]);

    // 募集中のみフィルタ（締切が現在時刻より後）
    const openRequests = useMemo(() => {
        const now = new Date();
        return shiftRequests.filter((request) => {
            const deadline = new Date(request.deadline);
            return deadline > now;
        });
    }, [shiftRequests]);

    // 出勤予定日をMapに変換（date -> shift info）
    const approvedShiftMap = useMemo(() => {
        const map = new Map<string, ApprovedShift>();
        for (const shift of approvedShifts) {
            map.set(shift.date, shift);
        }
        return map;
    }, [approvedShifts]);

    // 提出済みのリクエストIDをSetに変換
    const submittedRequestIdsSet = useMemo(() => {
        return new Set(submittedRequestIds);
    }, [submittedRequestIds]);

    // カレンダーのナビゲーション
    const goToPreviousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const goToToday = () => {
        const now = new Date();
        setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    };

    return (
        <div className="space-y-4">
            {/* 募集中のシフト */}
            {openRequests.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                    {openRequests.map((request) => (
                        <ShiftRequestCard
                            key={request.id}
                            request={request}
                            isSubmitted={submittedRequestIdsSet.has(request.id)}
                            onClick={() => setSelectedRequest(request)}
                        />
                    ))}
                </div>
            )}

            {/* Vercel-style View Toggle */}
            <div className="relative">
                <div className="flex">
                    <button
                        ref={(el) => { viewTabsRef.current["calendar"] = el; }}
                        type="button"
                        onClick={() => setViewMode("calendar")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors relative flex items-center justify-center gap-1.5 ${
                            viewMode === "calendar"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        <Calendar className="h-4 w-4" />
                        カレンダー
                    </button>
                    <button
                        ref={(el) => { viewTabsRef.current["shifts"] = el; }}
                        type="button"
                        onClick={() => setViewMode("shifts")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors relative flex items-center justify-center gap-1.5 ${
                            viewMode === "shifts"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        <ClipboardList className="h-4 w-4" />
                        シフト
                    </button>
                </div>
                <div
                    className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-200"
                    style={{ left: viewIndicatorStyle.left, width: viewIndicatorStyle.width }}
                />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Content */}
            {viewMode === "shifts" ? (
                <ShiftsList
                    currentMonth={currentMonth}
                    approvedShiftMap={approvedShiftMap}
                    onPreviousMonth={goToPreviousMonth}
                    onNextMonth={goToNextMonth}
                    onGoToToday={goToToday}
                    profileRole={profileRole}
                />
            ) : (
                <ShiftCalendar
                    currentMonth={currentMonth}
                    approvedShiftMap={approvedShiftMap}
                    onPreviousMonth={goToPreviousMonth}
                    onNextMonth={goToNextMonth}
                    onGoToToday={goToToday}
                />
            )}

            {selectedRequest && (
                <SubmissionModal
                    isOpen={selectedRequest !== null}
                    onClose={() => setSelectedRequest(null)}
                    request={selectedRequest}
                    profileId={profileId}
                    profileRole={profileRole}
                    storeDefaults={storeDefaults}
                />
            )}
        </div>
    );
}

function ShiftRequestCard({
    request,
    isSubmitted,
    onClick,
}: {
    request: ShiftRequest;
    isSubmitted: boolean;
    onClick: () => void;
}) {
    const dates = request.shift_request_dates || [];
    const dateRange = getDateRange(dates);
    const deadline = new Date(request.deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const getDeadlineBadge = () => {
        // 提出済みの場合は提出済みタグを表示
        if (isSubmitted) {
            return (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    提出済み
                </span>
            );
        }
        if (daysUntilDeadline <= 1) {
            return (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    締切間近
                </span>
            );
        }
        if (daysUntilDeadline <= 3) {
            return (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    あと{daysUntilDeadline}日
                </span>
            );
        }
        return (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                募集中
            </span>
        );
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-left transition-all hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600"
        >
            {/* Deadline Badge + Date Range */}
            <div className="flex items-center gap-2 mb-3">
                {getDeadlineBadge()}
                <span className="font-semibold text-gray-900 dark:text-white">
                    {dateRange}
                </span>
            </div>

            {/* Description */}
            {request.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                    {request.description}
                </p>
            )}

            {/* Deadline */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                <span>
                    期限: {formatDeadline(request.deadline)}
                </span>
            </div>
        </button>
    );
}

type FilterType = "all" | "today";
type ReservationType = "douhan" | "shimei" | "none" | null;

function ShiftsList({
    currentMonth,
    approvedShiftMap,
    onPreviousMonth,
    onNextMonth,
    onGoToToday,
    profileRole,
}: {
    currentMonth: Date;
    approvedShiftMap: Map<string, ApprovedShift>;
    onPreviousMonth: () => void;
    onNextMonth: () => void;
    onGoToToday: () => void;
    profileRole: string;
}) {
    const router = useRouter();
    const [filter, setFilter] = useState<FilterType>("all");
    const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
    const [editingType, setEditingType] = useState<"douhan" | "shimei" | null>(null);
    const [guestNameInputs, setGuestNameInputs] = useState<{ [key: string]: string }>({});
    const [savingShiftId, setSavingShiftId] = useState<string | null>(null);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const isCast = profileRole === "cast";

    // 今日の日付を取得
    const todayStr = new Date().toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");

    // 月の全日付を生成
    const monthDates = useMemo(() => {
        const dates: { date: string; day: number; dayOfWeek: number }[] = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const date = new Date(year, month, day);
            dates.push({
                date: dateStr,
                day,
                dayOfWeek: date.getDay(),
            });
        }
        return dates;
    }, [year, month, daysInMonth]);

    // フィルター適用
    const filteredDates = useMemo(() => {
        if (filter === "today") {
            return monthDates.filter((d) => d.date === todayStr);
        }
        return monthDates;
    }, [monthDates, filter, todayStr]);

    // 今日タグをクリックしたとき
    const handleTodayFilter = () => {
        onGoToToday();
        setFilter("today");
    };

    // 同伴・指名タイプを変更
    const handleReservationTypeChange = async (
        shiftId: string,
        newType: ReservationType,
        currentGuestName: string | null
    ) => {
        if (newType === "none") {
            // なしの場合は即座に保存
            setSavingShiftId(shiftId);
            await updateReservationType(shiftId, "none", null);
            setSavingShiftId(null);
            setEditingShiftId(null);
            setEditingType(null);
            router.refresh();
        } else if (newType === "douhan" || newType === "shimei") {
            // 同伴または指名の場合は入力欄を表示
            setEditingShiftId(shiftId);
            setEditingType(newType);
            setGuestNameInputs((prev) => ({
                ...prev,
                [shiftId]: currentGuestName || "",
            }));
        }
    };

    // ゲスト名を保存
    const handleSaveGuestName = async (shiftId: string, reservationType: ReservationType) => {
        const guestName = guestNameInputs[shiftId] || "";
        setSavingShiftId(shiftId);
        await updateReservationType(shiftId, reservationType, guestName);
        setSavingShiftId(null);
        setEditingShiftId(null);
        setEditingType(null);
        router.refresh();
    };

    // 保存時のタイプを取得
    const getReservationTypeForSave = (shift: ApprovedShift): ReservationType => {
        if (editingShiftId === shift.id && editingType) {
            return editingType;
        }
        return shift.reservationType || null;
    };

    return (
        <div className="space-y-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={onPreviousMonth}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        {year}年{month + 1}月
                    </h2>
                    <button
                        type="button"
                        onClick={onGoToToday}
                        className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        今月
                    </button>
                </div>
                <button
                    type="button"
                    onClick={onNextMonth}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
            </div>

            {/* Filter Tags */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        filter === "all"
                            ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                >
                    すべて
                </button>
                <button
                    type="button"
                    onClick={handleTodayFilter}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        filter === "today"
                            ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                >
                    今日
                </button>
            </div>

            {/* Date Cards */}
            <div className="space-y-2">
                {filteredDates.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        シフトがありません
                    </div>
                ) : filteredDates.map(({ date, day, dayOfWeek }) => {
                    const shift = approvedShiftMap.get(date);
                    const isToday = date === todayStr;
                    const isSunday = dayOfWeek === 0;
                    const isSaturday = dayOfWeek === 6;
                    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
                    const isEditing = shift && editingShiftId === shift.id;
                    const isSaving = shift && savingShiftId === shift.id;

                    return (
                        <div
                            key={date}
                            className={`bg-white dark:bg-gray-900 rounded-xl border p-3 ${
                                isToday
                                    ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20"
                                    : "border-gray-200 dark:border-gray-700"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`text-base font-semibold ${
                                            isToday
                                                ? "text-blue-600 dark:text-blue-400"
                                                : isSunday
                                                ? "text-red-500"
                                                : isSaturday
                                                ? "text-blue-500"
                                                : "text-gray-900 dark:text-white"
                                        }`}
                                    >
                                        {month + 1}/{day}（{weekDays[dayOfWeek]}）
                                    </span>
                                    {isToday && (
                                        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                                            今日
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {shift ? (
                                        <>
                                            {shift.status === "approved" && (
                                                <>
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        {shift.startTime?.slice(0, 5) || "--:--"} 〜 {shift.endTime?.slice(0, 5) || "--:--"}
                                                    </span>
                                                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                        確定
                                                    </span>
                                                </>
                                            )}
                                            {shift.status === "pending" && (
                                                <>
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        {shift.startTime?.slice(0, 5) || "--:--"} 〜 {shift.endTime?.slice(0, 5) || "--:--"}
                                                    </span>
                                                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                        提出済み
                                                    </span>
                                                </>
                                            )}
                                            {shift.status === "rejected" && (
                                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                    否認
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-sm text-gray-400 dark:text-gray-500">
                                            -
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* キャストの場合、確定シフトに同伴・指名選択を表示 */}
                            {isCast && shift && shift.status === "approved" && (
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                                    {/* 同伴・指名選択ボタン */}
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleReservationTypeChange(shift.id, "douhan", shift.guestName || null)}
                                            disabled={isSaving}
                                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                                shift.reservationType === "douhan"
                                                    ? "bg-pink-600 text-white"
                                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                            }`}
                                        >
                                            同伴
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleReservationTypeChange(shift.id, "shimei", shift.guestName || null)}
                                            disabled={isSaving}
                                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                                shift.reservationType === "shimei"
                                                    ? "bg-purple-600 text-white"
                                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                            }`}
                                        >
                                            指名
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleReservationTypeChange(shift.id, "none", null)}
                                            disabled={isSaving}
                                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                                shift.reservationType === "none" || !shift.reservationType
                                                    ? "bg-gray-600 text-white dark:bg-gray-500"
                                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                            }`}
                                        >
                                            なし
                                        </button>
                                    </div>

                                    {/* ゲスト名入力欄（同伴または指名が選択されている場合） */}
                                    {(shift.reservationType === "douhan" || shift.reservationType === "shimei" || isEditing) && (
                                        <div className="mt-2 flex gap-2">
                                            <Input
                                                type="text"
                                                placeholder="ゲスト名を入力"
                                                value={guestNameInputs[shift.id] ?? shift.guestName ?? ""}
                                                onChange={(e) =>
                                                    setGuestNameInputs((prev) => ({
                                                        ...prev,
                                                        [shift.id]: e.target.value,
                                                    }))
                                                }
                                                className="flex-1 h-8 text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleSaveGuestName(shift.id, getReservationTypeForSave(shift))}
                                                disabled={isSaving}
                                                className="px-3 py-1 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                            >
                                                {isSaving ? "保存中..." : "保存"}
                                            </button>
                                        </div>
                                    )}

                                    {/* 保存済みのゲスト名表示 */}
                                    {shift.guestName && !isEditing && (shift.reservationType === "douhan" || shift.reservationType === "shimei") && (
                                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                            ゲスト: {shift.guestName}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ShiftCalendar({
    currentMonth,
    approvedShiftMap,
    onPreviousMonth,
    onNextMonth,
    onGoToToday,
}: {
    currentMonth: Date;
    approvedShiftMap: Map<string, ApprovedShift>;
    onPreviousMonth: () => void;
    onNextMonth: () => void;
    onGoToToday: () => void;
}) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Get first day of month and number of days
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const days: (number | null)[] = [];
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }
        return days;
    }, [daysInMonth, startingDayOfWeek]);

    const formatDateKey = (day: number) => {
        const m = String(month + 1).padStart(2, "0");
        const d = String(day).padStart(2, "0");
        return `${year}-${m}-${d}`;
    };

    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
    const today = new Date();
    const isToday = (day: number) => {
        return (
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day
        );
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Calendar Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <button
                    type="button"
                    onClick={onPreviousMonth}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        {year}年{month + 1}月
                    </h2>
                    <button
                        type="button"
                        onClick={onGoToToday}
                        className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        今月
                    </button>
                </div>
                <button
                    type="button"
                    onClick={onNextMonth}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
                {weekDays.map((day, idx) => (
                    <div
                        key={day}
                        className={`py-2 text-center text-xs font-medium ${
                            idx === 0
                                ? "text-red-500"
                                : idx === 6
                                ? "text-blue-500"
                                : "text-gray-500 dark:text-gray-400"
                        }`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                    if (day === null) {
                        return (
                            <div
                                key={`empty-${index}`}
                                className="min-h-[56px] border-b border-r border-gray-100 dark:border-gray-800 last:border-r-0"
                            />
                        );
                    }

                    const dateKey = formatDateKey(day);
                    const shift = approvedShiftMap.get(dateKey);
                    const dayOfWeek = (startingDayOfWeek + day - 1) % 7;
                    const isSunday = dayOfWeek === 0;
                    const isSaturday = dayOfWeek === 6;

                    return (
                        <div
                            key={dateKey}
                            className={`min-h-[56px] p-1 border-b border-r border-gray-100 dark:border-gray-800 last:border-r-0 ${
                                isToday(day) ? "bg-blue-50 dark:bg-blue-900/20" : ""
                            }`}
                        >
                            {/* Day Number */}
                            <div
                                className={`text-xs font-medium mb-1 ${
                                    isToday(day)
                                        ? "text-blue-600 dark:text-blue-400"
                                        : isSunday
                                        ? "text-red-500"
                                        : isSaturday
                                        ? "text-blue-500"
                                        : "text-gray-700 dark:text-gray-300"
                                }`}
                            >
                                {day}
                            </div>

                            {/* Shift Display */}
                            {shift && shift.status === "approved" && (
                                <div className="flex items-center gap-0.5 text-[10px] leading-tight px-1 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                    <Clock className="h-2.5 w-2.5" />
                                    <span className="truncate">{formatTimeRange(shift.startTime, shift.endTime)}</span>
                                </div>
                            )}
                            {shift && shift.status === "pending" && (
                                <div className="flex justify-center">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                                </div>
                            )}
                            {shift && shift.status === "rejected" && (
                                <div className="flex justify-center">
                                    <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30" />
                    <span>確定</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                    <span>提出済み</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400" />
                    <span>否認</span>
                </div>
            </div>
        </div>
    );
}

function getDateRange(dates: ShiftRequestDate[]): string {
    if (dates.length === 0) return "日付なし";
    if (dates.length === 1) return formatDate(dates[0].target_date);

    const sorted = [...dates].sort((a, b) => a.target_date.localeCompare(b.target_date));
    const first = sorted[0].target_date;
    const last = sorted[sorted.length - 1].target_date;

    return `${formatDate(first)} 〜 ${formatDate(last)}（${dates.length}日間）`;
}

function formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split("-").map(Number);
    return `${month}/${day}`;
}

function formatDeadline(deadline: string): string {
    const date = new Date(deadline);
    return date.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatTimeRange(startTime: string | null, endTime: string | null): string {
    if (!startTime && !endTime) return "時間未定";

    const formatTime = (time: string | null) => {
        if (!time) return "";
        // HH:mm:ss or HH:mm format
        const parts = time.split(":");
        return `${parts[0]}:${parts[1]}`;
    };

    if (startTime && endTime) {
        return `${formatTime(startTime)}-${formatTime(endTime)}`;
    }
    if (startTime) {
        return `${formatTime(startTime)}〜`;
    }
    return `〜${formatTime(endTime)}`;
}
