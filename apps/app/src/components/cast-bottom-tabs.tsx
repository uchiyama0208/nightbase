"use client";

import { usePathname, useRouter } from "next/navigation";
import { Clock, Calendar, Trophy, MessageCircle } from "lucide-react";
import { useAuthHelpers } from "@/app/app/hooks";

type TabKey = "timecard" | "my-shifts" | "ranking" | "board";

interface Tab {
    key: TabKey;
    label: string;
    icon: React.ReactNode;
    href: string;
    pageKey: string; // Permission key
}

const allTabs: Tab[] = [
    { key: "timecard", label: "タイムカード", icon: <Clock className="h-5 w-5" />, href: "/app/timecard", pageKey: "timecard" },
    { key: "my-shifts", label: "マイシフト", icon: <Calendar className="h-5 w-5" />, href: "/app/my-shifts", pageKey: "my-shifts" },
    { key: "ranking", label: "ランキング", icon: <Trophy className="h-5 w-5" />, href: "/app/ranking", pageKey: "ranking" },
    { key: "board", label: "掲示板", icon: <MessageCircle className="h-5 w-5" />, href: "/app/board", pageKey: "board" },
];

export function CastBottomTabs() {
    const pathname = usePathname();
    const router = useRouter();
    const { hasAccess } = useAuthHelpers();

    // Filter tabs based on permissions
    const tabs = allTabs.filter(tab => hasAccess(tab.pageKey));

    // アクティブなタブを判定
    const getActiveTab = (): TabKey | null => {
        if (pathname.includes("/timecard")) return "timecard";
        if (pathname.includes("/my-shifts")) return "my-shifts";
        if (pathname.includes("/ranking")) return "ranking";
        if (pathname.includes("/board")) return "board";
        return null;
    };

    const activeTab = getActiveTab();

    const handleTabClick = (tab: Tab) => {
        router.push(tab.href);
    };

    // Don't show nav if no tabs are accessible
    if (tabs.length === 0) {
        return null;
    }

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-around h-14 px-1">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => handleTabClick(tab)}
                            className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
                                isActive
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                        >
                            {tab.icon}
                            <span className={`mt-1 text-[10px] font-medium ${
                                isActive ? "text-blue-600 dark:text-blue-400" : ""
                            }`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
            {/* Safe area for iOS */}
            <div className="h-safe-area-inset-bottom bg-white dark:bg-gray-900" />
        </nav>
    );
}
