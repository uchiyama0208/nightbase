"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VercelTabs } from "@/components/ui/vercel-tabs";
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

            {/* Tab Navigation */}
            <VercelTabs
                tabs={[
                    { key: "posts", label: "投稿" },
                    { key: "schedule", label: "スケジュール" }
                ]}
                value={activeTab}
                onChange={(val) => setActiveTab(val as Tab)}
                className="mb-4"
            />

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
