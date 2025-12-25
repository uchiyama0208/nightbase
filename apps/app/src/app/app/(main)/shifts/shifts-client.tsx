"use client";

import { useState, useMemo } from "react";
import { Plus, Settings, Calendar, Clock } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShiftsGrid } from "./shifts-grid";
import { type GridCellData, type ShiftRequestWithDates } from "./actions";

// 日付を短い形式でフォーマット (M/D)
function formatDateShort(dateStr: string): string {
    const [, month, day] = dateStr.split("-").map(Number);
    return `${month}/${day}`;
}

// Lazy load modals
const ShiftRequestModal = dynamic(
    () => import("./shift-request-modal").then((mod) => ({ default: mod.ShiftRequestModal })),
    { loading: () => null, ssr: false }
);
const ShiftDateModal = dynamic(
    () => import("./shift-date-modal").then((mod) => ({ default: mod.ShiftDateModal })),
    { loading: () => null, ssr: false }
);
const ShiftCellModal = dynamic(
    () => import("./shift-cell-modal").then((mod) => ({ default: mod.ShiftCellModal })),
    { loading: () => null, ssr: false }
);
const UserEditModal = dynamic(
    () => import("../users/user-edit-modal").then((mod) => ({ default: mod.UserEditModal })),
    { loading: () => null, ssr: false }
);
const ShiftRequestDetailModal = dynamic(
    () => import("./shift-request-detail-modal").then((mod) => ({ default: mod.ShiftRequestDetailModal })),
    { loading: () => null, ssr: false }
);

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

interface CalendarData {
    [date: string]: {
        hasRequest: boolean;
        castCount: number;
        staffCount: number;
        requestDateId?: string;
        // キャスト別カウント
        castConfirmed?: number;
        castSubmitted?: number;
        castNotSubmitted?: number;
        // スタッフ別カウント
        staffConfirmed?: number;
        staffSubmitted?: number;
        staffNotSubmitted?: number;
    };
}

interface PagePermissions {
    bottles: boolean;
    resumes: boolean;
    salarySystems: boolean;
    attendance: boolean;
    personalInfo: boolean;
}

interface ShiftsClientProps {
    initialCalendarData: CalendarData;
    profiles: Profile[];
    storeId: string;
    profileId: string;
    storeDefaults: StoreDefaults | null;
    storeName: string;
    existingDates: string[];
    closedDays: string[];
    daySwitchTime: string;
    openShiftRequests: ShiftRequestWithDates[];
    canEdit?: boolean;
    pagePermissions?: PagePermissions;
}

export function ShiftsClient({
    initialCalendarData,
    profiles,
    storeId,
    profileId,
    storeDefaults,
    storeName,
    existingDates,
    closedDays,
    daySwitchTime,
    openShiftRequests,
    canEdit = false,
    pagePermissions,
}: ShiftsClientProps) {
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ShiftRequestWithDates | null>(null);

    // 今日の営業日を計算
    const todayBusinessDate = useMemo(() => {
        const now = new Date();
        const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
        const currentHour = jstNow.getHours();
        const currentMinute = jstNow.getMinutes();

        const [switchHour, switchMinute] = daySwitchTime.split(":").map(Number);

        let businessDate = new Date(jstNow);
        if (currentHour < switchHour || (currentHour === switchHour && currentMinute < switchMinute)) {
            businessDate.setDate(businessDate.getDate() - 1);
        }

        return businessDate.toLocaleDateString("ja-JP", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).replace(/\//g, "-");
    }, [daySwitchTime]);

    // 今日のカレンダーデータ
    const todayData = initialCalendarData[todayBusinessDate];
    const [selectedDateInfo, setSelectedDateInfo] = useState<{
        date: string;
        requestDateId?: string;
    } | null>(null);
    const [selectedCellInfo, setSelectedCellInfo] = useState<{
        date: string;
        profileId: string;
        profileName: string;
        cell: GridCellData | null;
        requestDateId?: string;
    } | null>(null);
    const [gridRefreshKey, setGridRefreshKey] = useState(0);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

    const handleGridRefresh = () => {
        setGridRefreshKey((prev) => prev + 1);
    };

    const handleProfileClick = (profileId: string) => {
        setSelectedProfileId(profileId);
    };

    const selectedProfile = selectedProfileId
        ? (() => {
            const p = profiles.find((p) => p.id === selectedProfileId);
            return p ? {
                ...p,
                store_id: storeId,
                display_name_kana: null,
                real_name: null,
                real_name_kana: null,
            } : null;
          })()
        : null;

    const handleDateClick = (date: string, requestDateId?: string) => {
        setSelectedDateInfo({ date, requestDateId });
    };

    const handleCellClick = (date: string, profileId: string, profileName: string, cell: GridCellData | null, requestDateId?: string) => {
        setSelectedCellInfo({ date, profileId, profileName, cell, requestDateId });
    };

    // 前日・翌日に移動
    const handleNavigate = (direction: "prev" | "next") => {
        if (!selectedDateInfo) return;

        const currentDate = new Date(selectedDateInfo.date);
        if (direction === "prev") {
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            currentDate.setDate(currentDate.getDate() + 1);
        }

        const newDateStr = currentDate.toLocaleDateString("ja-JP", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).replace(/\//g, "-");

        // 新しい日付のrequestDateIdを取得
        const newRequestDateId = initialCalendarData[newDateStr]?.requestDateId;

        setSelectedDateInfo({
            date: newDateStr,
            requestDateId: newRequestDateId,
        });
    };

    return (
        <>
            {/* Header: Today's counts & Icons */}
            <div className="flex items-center justify-between mb-4">
                {/* Today's Attendance Counts */}
                <button
                    type="button"
                    onClick={() => handleDateClick(todayBusinessDate, todayData?.requestDateId)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm shadow-sm"
                    style={{ backgroundColor: "white" }}
                >
                    <span className="text-gray-500 dark:text-gray-400">本日</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                        キャスト {todayData?.castCount ?? 0}
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                        スタッフ {todayData?.staffCount ?? 0}
                    </span>
                </button>

                {/* Icons */}
                {canEdit && (
                    <div className="flex items-center gap-2">
                        <Link
                            href="/app/settings/shift"
                            className="h-10 w-10 rounded-full bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700 shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                            aria-label="設定"
                        >
                            <Settings className="h-5 w-5" />
                        </Link>
                        <Button
                            size="icon"
                            className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                            onClick={() => setIsRequestModalOpen(true)}
                            aria-label="追加"
                        >
                            <Plus className="h-5 w-5" />
                        </Button>
                    </div>
                )}
            </div>

            {/* 募集中のシフト */}
            {openShiftRequests.length > 0 && (
                <div className="mb-4 space-y-2">
                    {openShiftRequests.map((request) => {
                        const dates = request.shift_request_dates || [];
                        const sortedDates = [...dates].sort((a, b) =>
                            a.target_date.localeCompare(b.target_date)
                        );
                        const dateRange = sortedDates.length > 0
                            ? sortedDates.length === 1
                                ? formatDateShort(sortedDates[0].target_date)
                                : `${formatDateShort(sortedDates[0].target_date)} 〜 ${formatDateShort(sortedDates[sortedDates.length - 1].target_date)}`
                            : "";
                        const deadline = new Date(request.deadline);
                        const deadlineStr = deadline.toLocaleString("ja-JP", {
                            timeZone: "Asia/Tokyo",
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        });

                        return (
                            <button
                                key={request.id}
                                type="button"
                                onClick={() => setSelectedRequest(request)}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40">
                                        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                            {request.title || "シフト募集"}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {dateRange}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                    <Clock className="h-3 w-3" />
                                    <span>〆 {deadlineStr}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Grid */}
            <ShiftsGrid
                storeId={storeId}
                refreshKey={gridRefreshKey}
                onDateClick={handleDateClick}
                onCellClick={handleCellClick}
                onProfileClick={handleProfileClick}
            />

            {/* Modals */}
            {isRequestModalOpen && (
                <ShiftRequestModal
                    isOpen={isRequestModalOpen}
                    onClose={() => setIsRequestModalOpen(false)}
                    profiles={profiles}
                    storeId={storeId}
                    profileId={profileId}
                    storeDefaults={storeDefaults}
                    storeName={storeName}
                    existingDates={existingDates}
                    closedDays={closedDays}
                />
            )}

            {selectedDateInfo && (
                <ShiftDateModal
                    isOpen={selectedDateInfo !== null}
                    onClose={() => setSelectedDateInfo(null)}
                    date={selectedDateInfo.date}
                    requestDateId={selectedDateInfo.requestDateId}
                    profileId={profileId}
                    storeId={storeId}
                    storeName={storeName}
                    onNavigate={handleNavigate}
                    pagePermissions={pagePermissions}
                />
            )}

            {selectedCellInfo && (
                <ShiftCellModal
                    isOpen={selectedCellInfo !== null}
                    onClose={() => setSelectedCellInfo(null)}
                    onSuccess={handleGridRefresh}
                    date={selectedCellInfo.date}
                    targetProfileId={selectedCellInfo.profileId}
                    targetProfileName={selectedCellInfo.profileName}
                    cell={selectedCellInfo.cell}
                    requestDateId={selectedCellInfo.requestDateId}
                    storeId={storeId}
                    approverProfileId={profileId}
                />
            )}

            {selectedProfile && (
                <UserEditModal
                    profile={selectedProfile}
                    open={selectedProfileId !== null}
                    onOpenChange={(open) => !open && setSelectedProfileId(null)}
                    canEdit={canEdit}
                    hidePersonalInfo={!pagePermissions?.personalInfo}
                    pagePermissions={pagePermissions}
                />
            )}

            {selectedRequest && (
                <ShiftRequestDetailModal
                    isOpen={selectedRequest !== null}
                    onClose={() => setSelectedRequest(null)}
                    request={selectedRequest}
                    onDateClick={(date, requestDateId) => {
                        setSelectedRequest(null);
                        handleDateClick(date, requestDateId);
                    }}
                />
            )}
        </>
    );
}
