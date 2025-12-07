"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Calendar, Users, Layout, Coins, MessageCircle } from "lucide-react";

type TabKey = "shift" | "user" | "floor" | "salary" | "community";

interface Tab {
    key: TabKey;
    label: string;
    icon: React.ReactNode;
}

const tabs: Tab[] = [
    { key: "shift", label: "シフト", icon: <Calendar className="h-5 w-5" /> },
    { key: "user", label: "ユーザー", icon: <Users className="h-5 w-5" /> },
    { key: "floor", label: "フロア", icon: <Layout className="h-5 w-5" /> },
    { key: "salary", label: "料金給与", icon: <Coins className="h-5 w-5" /> },
    { key: "community", label: "コミュニティ", icon: <MessageCircle className="h-5 w-5" /> },
];

export function MobileBottomTabs() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    // ダッシュボードページでタブパラメータがある場合、そのタブを選択
    const isDashboard = pathname === "/app/dashboard";
    const currentTab = isDashboard ? (searchParams.get("tab") as TabKey | null) : null;

    const handleTabClick = (tabKey: TabKey) => {
        router.replace(`/app/dashboard?tab=${tabKey}`, { scroll: false });
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 lg:hidden">
            <div className="flex items-center justify-around h-14 px-1">
                {tabs.map((tab) => {
                    const isActive = currentTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => handleTabClick(tab.key)}
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
