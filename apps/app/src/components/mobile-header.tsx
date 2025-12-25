"use client";

import { Menu, User, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useDashboardTab } from "@/contexts/dashboard-tab-context";

interface MobileHeaderProps {
    onMenuClick: () => void;
    profileName?: string;
    avatarUrl?: string;
    hasSidebar?: boolean;
    userRole?: string;
}

const tabTitles: Record<string, string> = {
    shift: "シフト",
    user: "ユーザー",
    floor: "フロア",
    store: "店舗",
    community: "コミュニティ",
};

const getPageTitle = (pathname: string, activeTab: string | null): string => {
    // ダッシュボードでタブがある場合はタブ名を表示
    if (pathname.includes("/dashboard") && activeTab && tabTitles[activeTab]) {
        return tabTitles[activeTab];
    }
    if (pathname.includes("/dashboard")) return "シフト管理";
    if (pathname.includes("/settings/table-order")) return "テーブル注文設定";
    if (pathname.includes("/settings/timecard")) return "タイムカード設定";
    if (pathname.includes("/settings/shift")) return "シフト設定";
    if (pathname.includes("/timecard")) return "タイムカード";
    if (pathname.includes("/pickup")) return "送迎管理";
    if (pathname.includes("/attendance")) return "出勤管理";
    if (pathname.includes("/resumes")) return "履歴書";
    if (pathname.includes("/users")) return "プロフィール情報";
    if (pathname.includes("/invitations")) return "招待";
    if (pathname.includes("/roles")) return "権限";
    if (pathname.includes("/features")) return "機能追加";
    if (pathname.includes("/settings")) return "設定";
    if (pathname.includes("/floor")) return "フロア管理";
    if (pathname.includes("/seats")) return "席エディター";
    if (pathname.includes("/assignments")) return "付け回し";
    if (pathname.includes("/orders")) return "注文一覧";
    if (pathname.includes("/slips")) return "伝票";
    if (pathname.includes("/bottles")) return "ボトルキープ";
    if (pathname.includes("/menus")) return "メニュー";
    if (pathname.includes("/pricing-systems")) return "料金システム";
    if (pathname.includes("/salary-systems")) return "給与システム";
    if (pathname.includes("/payroll")) return "給与";
    if (pathname.includes("/sales")) return "売上";
    if (pathname.includes("/ranking")) return "ランキング";
    if (pathname.includes("/my-shifts")) return "マイシフト";
    if (pathname.includes("/shifts")) return "シフト管理";
    if (pathname.includes("/board")) return "掲示板";
    if (pathname.includes("/sns")) return "SNS投稿";
    if (pathname.includes("/queue")) return "順番待ち";
    if (pathname.includes("/reservations")) return "予約";
    if (pathname.includes("/shopping")) return "買い出し";
    if (pathname.includes("/ai-create")) return "AIクリエイト";
    if (pathname.includes("/me")) return "マイページ";
    return "ダッシュボード";
};

export function MobileHeader({ onMenuClick, profileName, avatarUrl, hasSidebar, userRole }: MobileHeaderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const dashboardTab = useDashboardTab();
    const activeTab = dashboardTab?.activeTab ?? null;
    const pageTitle = getPageTitle(pathname, activeTab);

    // キャストかどうかを判定
    const isCast = userRole === "cast";

    // ダッシュボードかどうかを判定
    const isDashboard = pathname === "/app/dashboard" || pathname.startsWith("/app/dashboard?");

    // router.back()を使うべきページ（サブページからの遷移）
    const shouldUseRouterBack = (): boolean => {
        // ordersはfloorからの遷移なのでrouter.back()を使う
        if (pathname.includes("/orders")) return true;
        // settings配下は遷移元に戻る
        if (pathname.includes("/settings/")) return true;
        return false;
    };

    // 戻り先のタブを決定
    const getBackTab = (): string | null => {
        if (isDashboard) return null;
        if (shouldUseRouterBack()) return null;
        if (pathname.includes("/shifts") || pathname.includes("/my-shifts") || pathname.includes("/pickup") || pathname.includes("/attendance") || pathname.includes("/timecard")) return "shift";
        if (pathname.includes("/users") || pathname.includes("/resumes") || pathname.includes("/invitations") || pathname.includes("/roles")) return "user";
        if (pathname.includes("/floor") || pathname.includes("/seats") || pathname.includes("/assignments") || pathname.includes("/slips") || pathname.includes("/bottles")) return "floor";
        if (pathname.includes("/menus") || pathname.includes("/pricing-systems") || pathname.includes("/salary-systems") || pathname.includes("/payroll") || pathname.includes("/sales") || pathname.includes("/shopping")) return "store";
        if (pathname.includes("/board") || pathname.includes("/sns") || pathname.includes("/ai-create") || pathname.includes("/ranking")) return "community";
        if (pathname.includes("/queue") || pathname.includes("/reservations")) return "floor";
        return null;
    };

    const backTab = getBackTab();

    const handleBack = () => {
        if (backTab) {
            router.push(`/app/dashboard?tab=${backTab}`);
        } else {
            router.back();
        }
    };

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-12 ${hasSidebar ? "lg:pl-72" : ""}`}
        >
            <div className="flex items-center justify-between h-full px-3">
                {/* Left: Hamburger Menu (Dashboard only) or Back Button - Hidden for Cast */}
                {isCast ? (
                    <div className="w-10 h-10" /> // プレースホルダー
                ) : isDashboard ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onMenuClick}
                        className="text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 lg:hidden"
                        aria-label="メニュー"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleBack}
                        className="text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 lg:hidden"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                )}

                {/* Center: Page Title */}
                <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                    {pageTitle}
                </h1>

                {/* Right: Profile Icon */}
                <Link href="/app/me">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700"
                        aria-label="プロフィール"
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
