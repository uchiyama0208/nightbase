"use client";

import { Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useDashboardTab } from "@/contexts/dashboard-tab-context";

interface MobileHeaderProps {
    onMenuClick: () => void;
    profileName?: string;
    avatarUrl?: string;
    hasSidebar?: boolean;
}

const tabTitles: Record<string, string> = {
    shift: "シフト",
    user: "ユーザー",
    floor: "フロア",
    salary: "料金給与",
    community: "コミュニティ",
};

const getPageTitle = (pathname: string, activeTab: string | null): string => {
    // ダッシュボードでタブがある場合はタブ名を表示
    if (pathname.includes("/dashboard") && activeTab && tabTitles[activeTab]) {
        return tabTitles[activeTab];
    }
    if (pathname.includes("/dashboard")) return "シフト";
    if (pathname.includes("/timecard")) return "タイムカード";
    if (pathname.includes("/pickup")) return "送迎管理";
    if (pathname.includes("/attendance")) return "出勤管理";
    if (pathname.includes("/users")) return "プロフィール情報";
    if (pathname.includes("/invitations")) return "招待";
    if (pathname.includes("/roles")) return "権限";
    if (pathname.includes("/features")) return "機能追加";
    if (pathname.includes("/settings")) return "設定";
    if (pathname.includes("/me")) return "マイページ";
    if (pathname.includes("/floor")) return "フロア管理";
    if (pathname.includes("/seats")) return "席エディター";
    if (pathname.includes("/assignments")) return "付け回し";
    if (pathname.includes("/orders")) return "注文";
    if (pathname.includes("/slips")) return "伝票";
    if (pathname.includes("/bottles")) return "ボトル";
    if (pathname.includes("/menus")) return "メニュー";
    if (pathname.includes("/pricing-systems")) return "料金体系";
    if (pathname.includes("/salary-systems")) return "給与体系";
    if (pathname.includes("/my-shifts")) return "マイシフト";
    if (pathname.includes("/shifts")) return "シフト";
    if (pathname.includes("/board")) return "掲示板";
    if (pathname.includes("/sns")) return "SNS";
    return "シフト";
};

export function MobileHeader({ onMenuClick, profileName, avatarUrl, hasSidebar }: MobileHeaderProps) {
    const pathname = usePathname();
    const dashboardTab = useDashboardTab();
    const activeTab = dashboardTab?.activeTab ?? null;
    const pageTitle = getPageTitle(pathname, activeTab);

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-12 ${hasSidebar ? "lg:pl-72" : ""}`}
        >
            <div className="flex items-center justify-between h-full px-3">
                {/* Left: Hamburger Menu */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onMenuClick}
                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
                >
                    <Menu className="h-5 w-5" />
                </Button>

                {/* Center: Page Title */}
                <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                    {pageTitle}
                </h1>

                {/* Right: Profile Icon */}
                <Link href="/app/me">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                    >
                        <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                {avatarUrl ? (
                                    <Image
                                        src={avatarUrl}
                                        alt={profileName || "Profile"}
                                        width={32}
                                        height={32}
                                        className="object-cover"
                                    />
                                ) : profileName ? (
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        {profileName.charAt(0).toUpperCase()}
                                    </span>
                                ) : (
                                    <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                )}
                            </div>
                        </div>
                    </Button>
                </Link>
            </div>
        </header>
    );
}
