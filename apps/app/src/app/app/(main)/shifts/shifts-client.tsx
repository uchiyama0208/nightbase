"use client";

import { useState, useMemo } from "react";
import { Plus, Settings, Calendar, LayoutGrid } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShiftsCalendar } from "./shifts-calendar";
import { ShiftsCardList } from "./shifts-card-list";
import type { ShiftRequestWithDates } from "./actions";

// Lazy load modals
const ShiftRequestModal = dynamic(
    () => import("./shift-request-modal").then((mod) => ({ default: mod.ShiftRequestModal })),
    { loading: () => null, ssr: false }
);
const SettingsModal = dynamic(
    () => import("./settings-modal").then((mod) => ({ default: mod.SettingsModal })),
    { loading: () => null, ssr: false }
);
const ShiftDetailModal = dynamic(
    () => import("./shift-detail-modal").then((mod) => ({ default: mod.ShiftDetailModal })),
    { loading: () => null, ssr: false }
);
const SubmissionStatusModal = dynamic(
    () => import("./submission-status-modal").then((mod) => ({ default: mod.SubmissionStatusModal })),
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
    };
}

interface ShiftsClientProps {
    shiftRequests: ShiftRequestWithDates[];
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
    shiftRequests,
    initialCalendarData,
    profiles,
    storeId,
    profileId,
    storeDefaults,
    storeName,
    existingDates,
    closedDays,
}: ShiftsClientProps) {
    const [viewMode, setViewMode] = useState<"calendar" | "cards">("calendar");
    const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [selectedDateInfo, setSelectedDateInfo] = useState<{
        date: string;
        requestDateId?: string;
    } | null>(null);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

    const viewIndex = viewMode === "calendar" ? 0 : 1;

    const filteredRequests = useMemo(() => {
        if (statusFilter === "all") return shiftRequests;
        return shiftRequests.filter((r) => r.status === statusFilter);
    }, [shiftRequests, statusFilter]);

    const activeFilters = [statusFilter !== "all" && (statusFilter === "open" ? "募集中" : "締切")]
        .filter(Boolean)
        .map(String);
    const hasFilters = activeFilters.length > 0;

    const handleDateClick = (date: string, requestDateId?: string) => {
        setSelectedDateInfo({ date, requestDateId });
    };

    const handleRequestClick = (requestId: string) => {
        setSelectedRequestId(requestId);
    };

    return (
        <>
            {/* Header: Toggle + Icons */}
            <div className="flex items-center justify-between mb-4">
                <div className="relative inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
                    <div
                        className="absolute h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-transform duration-300 ease-in-out"
                        style={{
                            width: "100px",
                            left: "4px",
                            transform: `translateX(calc(${viewIndex} * 100px))`,
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => setViewMode("calendar")}
                        className={`relative z-10 w-[100px] flex items-center justify-center gap-1.5 h-8 rounded-full text-sm font-medium transition-colors duration-200 ${
                            viewMode === "calendar"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                    >
                        <Calendar className="h-4 w-4" />
                        カレンダー
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("cards")}
                        className={`relative z-10 w-[100px] flex items-center justify-center gap-1.5 h-8 rounded-full text-sm font-medium transition-colors duration-200 ${
                            viewMode === "cards"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                    >
                        <LayoutGrid className="h-4 w-4" />
                        募集一覧
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full"
                        onClick={() => setIsSettingsModalOpen(true)}
                    >
                        <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </Button>
                    <Button
                        size="icon"
                        className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                        onClick={() => setIsRequestModalOpen(true)}
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Filter (for cards view) */}
            {viewMode === "cards" && (
                <Accordion type="single" collapsible className="w-full mb-4">
                    <AccordionItem
                        value="filters"
                        className="rounded-2xl border border-gray-200 bg-white px-2 dark:border-gray-700 dark:bg-gray-800"
                    >
                        <AccordionTrigger className="px-2 text-sm font-semibold text-gray-900 dark:text-white">
                            <div className="flex w-full items-center justify-between pr-2">
                                <span>フィルター</span>
                                {hasFilters && (
                                    <span className="text-xs text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                                        {activeFilters.join("・")}
                                    </span>
                                )}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-2">
                            <div className="flex gap-2 pt-2 pb-2">
                                {[
                                    { value: "all", label: "すべて" },
                                    { value: "open", label: "募集中" },
                                    { value: "closed", label: "締切" },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setStatusFilter(option.value as typeof statusFilter)}
                                        className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                                            statusFilter === option.value
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}

            {/* Content */}
            {viewMode === "calendar" ? (
                <ShiftsCalendar
                    initialData={initialCalendarData}
                    storeId={storeId}
                    onDateClick={handleDateClick}
                />
            ) : (
                <ShiftsCardList
                    requests={filteredRequests}
                    onRequestClick={handleRequestClick}
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

            {isSettingsModalOpen && (
                <SettingsModal
                    isOpen={isSettingsModalOpen}
                    onClose={() => setIsSettingsModalOpen(false)}
                    storeId={storeId}
                    storeDefaults={storeDefaults}
                />
            )}

            {selectedDateInfo && (
                <ShiftDetailModal
                    isOpen={selectedDateInfo !== null}
                    onClose={() => setSelectedDateInfo(null)}
                    date={selectedDateInfo.date}
                    requestDateId={selectedDateInfo.requestDateId}
                    storeId={storeId}
                    profileId={profileId}
                />
            )}

            {selectedRequestId && (
                <SubmissionStatusModal
                    isOpen={selectedRequestId !== null}
                    onClose={() => setSelectedRequestId(null)}
                    requestId={selectedRequestId}
                    profileId={profileId}
                />
            )}
        </>
    );
}
