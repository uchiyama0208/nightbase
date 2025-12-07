"use client";

import { useState, useMemo, useCallback } from "react";
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
}: SnsClientProps) {
    const [activeTab, setActiveTab] = useState<Tab>("posts");
    const [postModalOpen, setPostModalOpen] = useState(false);
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

    const tabIndex = useMemo(() => activeTab === "posts" ? 0 : 1, [activeTab]);

    const handlePlusClick = useCallback(() => {
        if (activeTab === "posts") {
            setPostModalOpen(true);
        } else {
            setScheduleModalOpen(true);
        }
    }, [activeTab]);

    return (
        <>
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    SNS投稿
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    XやInstagramへの投稿を管理
                </p>
            </div>

            {/* Toggle with Plus button */}
            <div className="flex items-center justify-between">
                <div className="relative inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
                    <div
                        className="absolute h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-transform duration-300 ease-in-out"
                        style={{
                            width: "88px",
                            left: "4px",
                            transform: `translateX(calc(${tabIndex} * 88px))`
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => setActiveTab("posts")}
                        className={`relative z-10 w-[88px] flex items-center justify-center h-8 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                            activeTab === "posts"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                    >
                        投稿
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("schedule")}
                        className={`relative z-10 w-[88px] flex items-center justify-center h-8 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                            activeTab === "schedule"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                    >
                        スケジュール
                    </button>
                </div>

                <Button
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                    onClick={handlePlusClick}
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </div>

            {/* Tab content */}
            <div className="mt-4">
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
        </>
    );
}
