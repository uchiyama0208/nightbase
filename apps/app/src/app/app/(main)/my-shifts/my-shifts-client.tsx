"use client";

import { useState, useMemo } from "react";
import { Clock, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
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
    day_switch_time: string | null;
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

// 営業日を計算する関数
function getBusinessDate(daySwitchTime: string | null): string {
    const now = new Date();
    const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));

    // 営業日切り替え時間をパース (HH:mm:ss or HH:mm format)
    let switchHour = 6; // デフォルト: 06:00
    let switchMinute = 0;

    if (daySwitchTime) {
        const parts = daySwitchTime.split(":");
        switchHour = parseInt(parts[0], 10) || 6;
        switchMinute = parseInt(parts[1], 10) || 0;
    }

    // 現在時刻が切り替え時間より前なら前日が営業日
    const currentHour = jstNow.getHours();
    const currentMinute = jstNow.getMinutes();

    if (currentHour < switchHour || (currentHour === switchHour && currentMinute < switchMinute)) {
        jstNow.setDate(jstNow.getDate() - 1);
    }

    // YYYY-MM-DD形式で返す
    const year = jstNow.getFullYear();
    const month = String(jstNow.getMonth() + 1).padStart(2, "0");
    const day = String(jstNow.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
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

    // 営業日を計算して初期月を設定
    const businessDate = useMemo(() => getBusinessDate(storeDefaults?.day_switch_time || null), [storeDefaults?.day_switch_time]);

    const [currentMonth, setCurrentMonth] = useState(() => {
        const [year, month] = businessDate.split("-").map(Number);
        return new Date(year, month - 1, 1);
    });

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
        const [year, month] = businessDate.split("-").map(Number);
        setCurrentMonth(new Date(year, month - 1, 1));
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

            {/* シフトリスト */}
            <ShiftsList
                currentMonth={currentMonth}
                approvedShiftMap={approvedShiftMap}
                onPreviousMonth={goToPreviousMonth}
                onNextMonth={goToNextMonth}
                onGoToToday={goToToday}
                profileRole={profileRole}
                businessDate={businessDate}
            />

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
                <Clock className="h-5 w-5" />
                <span>
                    期限: {formatDeadline(request.deadline)}
                </span>
            </div>
        </button>
    );
}

type ReservationType = "douhan" | "shimei" | "none" | null;

function ShiftsList({
    currentMonth,
    approvedShiftMap,
    onPreviousMonth,
    onNextMonth,
    onGoToToday,
    profileRole,
    businessDate,
}: {
    currentMonth: Date;
    approvedShiftMap: Map<string, ApprovedShift>;
    onPreviousMonth: () => void;
    onNextMonth: () => void;
    onGoToToday: () => void;
    profileRole: string;
    businessDate: string;
}) {
    const router = useRouter();
    const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
    const [editingType, setEditingType] = useState<"douhan" | "shimei" | null>(null);
    const [guestNameInputs, setGuestNameInputs] = useState<{ [key: string]: string }>({});
    const [savingShiftId, setSavingShiftId] = useState<string | null>(null);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const isCast = profileRole === "cast";

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
                    className="p-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                    className="p-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
            </div>

            {/* Date Cards */}
            <div className="space-y-2">
                {monthDates.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        シフトがありません
                    </div>
                ) : monthDates.map(({ date, day, dayOfWeek }) => {
                    const shift = approvedShiftMap.get(date);
                    const isBusinessDay = date === businessDate;
                    const isSunday = dayOfWeek === 0;
                    const isSaturday = dayOfWeek === 6;
                    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
                    const isEditing = shift && editingShiftId === shift.id;
                    const isSaving = shift && savingShiftId === shift.id;

                    return (
                        <div
                            key={date}
                            className={`bg-white dark:bg-gray-900 rounded-xl border p-3 ${
                                isBusinessDay
                                    ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20"
                                    : "border-gray-200 dark:border-gray-700"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`text-base font-semibold ${
                                            isBusinessDay
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
                                    {isBusinessDay && (
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
