"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { User, Settings, Building2, CalendarDays } from "lucide-react";
import { StoreSelectorModal } from "./store-selector-modal";
import { AttendanceCalendar } from "./attendance-calendar";
import { formatJSTDate, formatJSTTime } from "@/lib/utils";
import { VercelTabs } from "@/components/ui/vercel-tabs";

interface TimeCard {
    id: string;
    work_date: string;
    clock_in: string | null;
    clock_out: string | null;
    store_name: string;
    store_icon_url: string | null;
    earnings: number | null;
}

interface ScheduledShift {
    id: string;
    target_date: string;
    start_time: string | null;
    end_time: string | null;
    store_name: string;
    store_icon_url: string | null;
}

interface Profile {
    id: string;
    display_name: string;
    role: string;
    stores: { id: string; name: string; icon_url?: string | null } | null;
}

interface MeContentProps {
    avatarUrl: string | null;
    displayName: string | null;
    profiles: Profile[];
    currentProfileId: string | null;
    currentStore: { id: string; name: string; icon_url?: string | null } | null;
    timeCards: TimeCard[];
    scheduledShifts: ScheduledShift[];
}

export function MeContent({
    avatarUrl,
    displayName,
    profiles,
    currentProfileId,
    currentStore,
    timeCards,
    scheduledShifts,
}: MeContentProps) {
    const [activeTab, setActiveTab] = useState<"history" | "calendar">("history");

    // Sort time cards by date (newest first) for history tab
    const sortedTimeCards = [...timeCards].sort((a, b) =>
        new Date(b.work_date).getTime() - new Date(a.work_date).getTime()
    );

    const tabs = [
        { key: "history", label: "履歴" },
        { key: "calendar", label: "カレンダー" },
    ];

    return (
        <div className="max-w-2xl mx-auto">
            {/* Compact Profile Header */}
            <div className="flex items-center gap-3">
                {avatarUrl ? (
                    <Image
                        src={avatarUrl}
                        alt={displayName || ""}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                        {displayName || "名前未設定"}
                    </h1>
                </div>
                {/* Store Selector Card */}
                <StoreSelectorModal
                    profiles={profiles}
                    currentProfileId={currentProfileId}
                    currentStoreName={currentStore?.name || null}
                    currentStoreIcon={currentStore?.icon_url || null}
                />
                <Link
                    href="/app/me/settings"
                    className="p-2 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
            </div>

            {/* Tab Navigation - Vercel Style */}
            <VercelTabs
                tabs={tabs}
                value={activeTab}
                onChange={(val) => setActiveTab(val as "history" | "calendar")}
                className="mt-4"
            />

            {/* Content */}
            <div className="mt-4">
                {activeTab === "calendar" ? (
                    <AttendanceCalendar timeCards={timeCards} scheduledShifts={scheduledShifts} />
                ) : (
                    <div className="space-y-3">
                        {sortedTimeCards.length === 0 ? (
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                                <CalendarDays className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400">
                                    出勤履歴がありません
                                </p>
                            </div>
                        ) : (
                            sortedTimeCards.map((card) => (
                                <div
                                    key={card.id}
                                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                    {formatJSTDate(card.work_date)}
                                                </p>
                                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                    <Building2 className="h-3 w-3" />
                                                    <span>{card.store_name}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                <span>
                                                    {card.clock_in ? formatJSTTime(card.clock_in) : "-"} 〜 {card.clock_out ? formatJSTTime(card.clock_out) : "-"}
                                                </span>
                                            </div>
                                        </div>
                                        {card.earnings !== null && (
                                            <div className="text-right">
                                                <p className="text-base font-semibold text-gray-900 dark:text-white">
                                                    ¥{card.earnings.toLocaleString()}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
