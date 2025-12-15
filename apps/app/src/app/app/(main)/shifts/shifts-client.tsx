"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Settings, Calendar, ClipboardList } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShiftsCalendar } from "./shifts-calendar";
import { ShiftsList } from "./shifts-list";
import { getDateSubmissions } from "./actions";

// Lazy load modals
const ShiftRequestModal = dynamic(
    () => import("./shift-request-modal").then((mod) => ({ default: mod.ShiftRequestModal })),
    { loading: () => null, ssr: false }
);
const ShiftDateModal = dynamic(
    () => import("./shift-date-modal").then((mod) => ({ default: mod.ShiftDateModal })),
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

interface ShiftsClientProps {
    initialCalendarData: CalendarData;
    profiles: Profile[];
    storeId: string;
    profileId: string;
    storeDefaults: StoreDefaults | null;
    storeName: string;
    existingDates: string[];
    closedDays: string[];
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
}: ShiftsClientProps) {
    const [viewMode, setViewMode] = useState<"calendar" | "shifts">("shifts");
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [selectedDateInfo, setSelectedDateInfo] = useState<{
        date: string;
        requestDateId?: string;
    } | null>(null);

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


    const handleDateClick = (date: string, requestDateId?: string) => {
        setSelectedDateInfo({ date, requestDateId });
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
            {/* Header: Icons */}
            <div className="flex items-center justify-end gap-2 mb-4">
                <Link
                    href="/app/settings/shift"
                    className="h-10 w-10 rounded-full bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-800 shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                >
                    <Settings className="h-5 w-5" />
                </Link>
                <Button
                    size="icon"
                    className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                    onClick={() => setIsRequestModalOpen(true)}
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </div>

            {/* Vercel-style View Toggle */}
            <div className="relative mb-4">
                <div className="flex">
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
                </div>
                <div
                    className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-200"
                    style={{ left: viewIndicatorStyle.left, width: viewIndicatorStyle.width }}
                />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Content */}
            {viewMode === "calendar" ? (
                <ShiftsCalendar
                    initialData={initialCalendarData}
                    storeId={storeId}
                    onDateClick={handleDateClick}
                />
            ) : (
                <ShiftsList
                    calendarData={initialCalendarData}
                    storeId={storeId}
                    profileId={profileId}
                    storeName={storeName}
                    onLoadDateSubmissions={getDateSubmissions}
                    onDateClick={handleDateClick}
                />
            )}

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
                    storeName={storeName}
                    onNavigate={handleNavigate}
                />
            )}
        </>
    );
}
