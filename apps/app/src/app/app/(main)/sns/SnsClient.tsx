"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    type SnsAccount,
    type SnsTemplate,
    type SnsScheduledPost,
    type SnsRecurringSchedule,
} from "./actions";
import { TemplateList } from "./TemplateList";
import { ScheduleList } from "./ScheduleList";

interface SnsClientProps {
    storeId: string;
    storeName: string;
    accounts: SnsAccount[];
    templates: SnsTemplate[];
    scheduledPosts: SnsScheduledPost[];
    postHistory: SnsScheduledPost[];
    recurringSchedules: SnsRecurringSchedule[];
    canEdit?: boolean;
}

type Tab = "posts" | "schedule";

export function SnsClient({
    storeId,
    storeName,
    accounts,
    templates,
    scheduledPosts,
    postHistory,
    recurringSchedules,
    canEdit = false,
}: SnsClientProps) {
    const [activeTab, setActiveTab] = useState<Tab>("posts");
    const [postModalOpen, setPostModalOpen] = useState(false);
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

    // Vercel-style tabs
    const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    useEffect(() => {
        const activeButton = tabsRef.current[activeTab];
        if (activeButton) {
            setIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
            });
        }
    }, [activeTab]);

    const handlePlusClick = useCallback(() => {
        if (activeTab === "posts") {
            setPostModalOpen(true);
        } else {
            setScheduleModalOpen(true);
        }
    }, [activeTab]);

    return (
        <div className="space-y-2">
            {/* Plus button */}
            {canEdit && (
                <div className="flex justify-end">
                    <Button
                        size="icon"
                        className="h-10 w-10 shrink-0 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                        onClick={handlePlusClick}
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
            )}

            {/* Vercel-style Tab Navigation */}
            <div className="relative">
                <div className="flex w-full">
                    <button
                        ref={(el) => { tabsRef.current["posts"] = el; }}
                        type="button"
                        onClick={() => setActiveTab("posts")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                            activeTab === "posts"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        投稿
                    </button>
                    <button
                        ref={(el) => { tabsRef.current["schedule"] = el; }}
                        type="button"
                        onClick={() => setActiveTab("schedule")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                            activeTab === "schedule"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        スケジュール
                    </button>
                </div>
                <div
                    className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-200"
                    style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Tab content */}
            {activeTab === "posts" && (
                <TemplateList
                    templates={templates}
                    storeId={storeId}
                    accounts={accounts}
                    scheduledPosts={scheduledPosts}
                    postHistory={postHistory}
                    externalModalOpen={postModalOpen}
                    onExternalModalClose={() => setPostModalOpen(false)}
                />
            )}
            {activeTab === "schedule" && (
                <ScheduleList
                    recurringSchedules={recurringSchedules}
                    templates={templates}
                    storeId={storeId}
                    accounts={accounts}
                    externalModalOpen={scheduleModalOpen}
                    onExternalModalClose={() => setScheduleModalOpen(false)}
                />
            )}
        </div>
    );
}
