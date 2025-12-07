"use client";

import { Menu, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface AdminHeaderProps {
    onMenuClick: () => void;
    userEmail?: string | null;
}

export function AdminHeader({ onMenuClick, userEmail }: AdminHeaderProps) {
    return (
        <header className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-12 lg:pl-72">
            <div className="flex items-center justify-between h-full px-3">
                {/* Left: Hamburger Menu (mobile only) */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onMenuClick}
                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden shrink-0"
                >
                    <Menu className="h-5 w-5" />
                </Button>

                {/* Center: Page Title */}
                <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate lg:hidden">
                    Admin
                </h1>

                {/* Right: User info */}
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-600 dark:text-gray-400 hidden lg:inline max-w-[200px] truncate">
                        {userEmail}
                    </span>
                    <Link href="/app/dashboard">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs whitespace-nowrap"
                        >
                            <span className="hidden sm:inline">アプリに戻る</span>
                            <span className="sm:hidden">戻る</span>
                        </Button>
                    </Link>
                </div>
            </div>
        </header>
    );
}
