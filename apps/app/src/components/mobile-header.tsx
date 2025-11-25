"use client";

import { Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface MobileHeaderProps {
    onMenuClick: () => void;
    profileName?: string;
    avatarUrl?: string;
}

const getPageTitle = (pathname: string): string => {
    if (pathname.includes("/dashboard")) return "ダッシュボード";
    if (pathname.includes("/timecard")) return "タイムカード";
    if (pathname.includes("/attendance")) return "出勤管理";
    if (pathname.includes("/users")) return "プロフィール情報";
    if (pathname.includes("/features")) return "機能追加";
    if (pathname.includes("/settings")) return "設定";
    if (pathname.includes("/me")) return "マイページ";
    return "ダッシュボード";
};

export function MobileHeader({ onMenuClick, profileName, avatarUrl }: MobileHeaderProps) {
    const pathname = usePathname();
    const pageTitle = getPageTitle(pathname);

    return (
        <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-12">
            <div className="flex items-center justify-between h-full px-3">
                {/* Left: Hamburger Menu */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onMenuClick}
                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
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
