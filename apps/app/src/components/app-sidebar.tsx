"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    CalendarDays,
    Clock,
    Users,
    Settings,
    LogOut,
    Menu,
    Shield,
    ShoppingBag,
    Utensils,
    Mail,
    UserCircle,
    ChevronDown,
    UserPlus,
    Wine,
    FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

interface StoreFeatures {
    show_dashboard?: boolean;
    show_attendance?: boolean;
    show_timecard?: boolean;
    show_users?: boolean;
    show_roles?: boolean;
    show_menus?: boolean;
}

interface SidebarProps {
    userRole?: string;
    profileName?: string;
    storeName?: string;
    storeFeatures?: StoreFeatures;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function AppSidebar({ userRole, profileName, storeName, storeFeatures, open: controlledOpen, onOpenChange }: SidebarProps) {
    const pathname = usePathname();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [internalOpen, setInternalOpen] = useState(false);

    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = onOpenChange || setInternalOpen;

    const mainRoutes = [
        {
            label: "ダッシュボード",
            icon: LayoutDashboard,
            href: "/app/dashboard",
            roles: ["admin", "staff"],
            feature: "dashboard" as const,
        },
        {
            label: "出勤一覧",
            icon: CalendarDays,
            href: "/app/attendance",
            roles: ["admin", "staff"],
            feature: "attendance" as const,
        },
        {
            label: "タイムカード",
            icon: Clock,
            href: "/app/timecard",
            roles: ["admin", "staff", "cast"],
            feature: "timecard" as const,
        },
        {
            label: "プロフィール情報",
            icon: Users,
            href: "/app/users",
            roles: ["admin", "staff"],
            feature: "users" as const,
        },
        {
            label: "メニュー",
            icon: Utensils,
            href: "/app/menus",
            roles: ["admin", "staff"],
            feature: "menus" as const,
        },
        {
            label: "ボトルキープ",
            icon: Wine,
            href: "/app/bottles",
            roles: ["admin", "staff"],
        },
        {
            label: "履歴書",
            icon: FileText,
            href: "/app/resumes",
            roles: ["admin", "staff"],
        },
    ];

    const settingsRoutes = [
        {
            label: "店舗設定",
            icon: Settings,
            href: "/app/settings",
            roles: ["admin", "staff"],
        },
        {
            label: "権限",
            icon: Shield,
            href: "/app/roles",
            roles: ["admin", "staff"],
            feature: "roles" as const,
        },
        {
            label: "機能追加",
            icon: ShoppingBag,
            href: "/app/features",
            roles: ["admin", "staff"],
        },
        {
            label: "招待",
            icon: Mail,
            href: "/app/invitations",
            roles: ["admin", "staff"],
        },
        {
            label: "参加申請",
            icon: UserPlus,
            href: "/app/settings/join-requests",
            roles: ["admin", "staff"],
        },
    ];

    const filterRoutes = (routes: any[]) => {
        return routes.filter((route) => {
            if (!userRole || !route.roles.includes(userRole)) return false;
            if (!storeFeatures) return true;
            if (route.feature === "dashboard" && storeFeatures.show_dashboard === false) return false;
            if (route.feature === "attendance" && storeFeatures.show_attendance === false) return false;
            if (route.feature === "timecard" && storeFeatures.show_timecard === false) return false;
            if (route.feature === "users" && storeFeatures.show_users === false) return false;
            if (route.feature === "roles" && storeFeatures.show_roles === false) return false;
            if (route.feature === "menus" && storeFeatures.show_menus === false) return false;
            return true;
        });
    };

    const filteredMainRoutes = filterRoutes(mainRoutes);
    const filteredSettingsRoutes = filterRoutes(settingsRoutes);

    const handleSignOut = async () => {
        const { signOut } = await import("@/app/app/(main)/settings/actions");
        await signOut();
    };

    const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
        <div className="flex h-full flex-col bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
            <div className="pt-3 pb-1 px-3 flex justify-center">
                <Image
                    src="/Nightbase_textlogo_trim.png"
                    alt="NightBase"
                    width={isMobile ? 110 : 150}
                    height={isMobile ? 26 : 34}
                    className="h-auto w-auto"
                    priority
                />
            </div>
            <div className="flex-1 px-3 py-3 overflow-y-auto">
                <nav className="space-y-1.5">
                    {filteredMainRoutes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
                                pathname === route.href ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                            )}
                        >
                            <route.icon className="h-5 w-5" />
                            {route.label}
                        </Link>
                    ))}

                    {/* Settings Group */}
                    {filteredSettingsRoutes.length > 0 && (
                        <div className="pt-2">
                            <button
                                onClick={() => setSettingsOpen(!settingsOpen)}
                                className="w-full flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                            >
                                <div className="flex items-center gap-3">
                                    <Settings className="h-5 w-5" />
                                    <span>設定</span>
                                </div>
                                <ChevronDown className={cn("h-4 w-4 transition-transform", settingsOpen ? "rotate-180" : "")} />
                            </button>

                            {settingsOpen && (
                                <div className="mt-1 ml-4 space-y-1 border-l-2 border-gray-100 dark:border-gray-700 pl-2">
                                    {filteredSettingsRoutes.map((route) => (
                                        <Link
                                            key={route.href}
                                            href={route.href}
                                            onClick={() => setOpen(false)}
                                            className={cn(
                                                "flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
                                                pathname === route.href ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                                            )}
                                        >
                                            <route.icon className="h-4 w-4" />
                                            {route.label}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </nav>
            </div>
            {!isMobile && (
                <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    {(profileName || storeName) && (
                        <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                            {profileName && (
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{profileName}</p>
                            )}
                            {storeName && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{storeName}</p>
                            )}
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                        onClick={handleSignOut}
                    >
                        <LogOut className="h-5 w-5" />
                        ログアウト
                    </Button>
                </div>
            )}
        </div>
    );

    return (
        <>
            {/* Mobile Sidebar */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent
                    side="left"
                    className="p-0 w-72 border-r-gray-200 dark:border-r-gray-700 bg-white dark:bg-gray-800 transition-transform duration-300 ease-in-out"
                >
                    <SheetHeader className="sr-only">
                        <SheetTitle>Menu</SheetTitle>
                        <SheetDescription>ナビゲーションメニュー</SheetDescription>
                    </SheetHeader>
                    <SidebarContent isMobile={true} />
                </SheetContent>
            </Sheet>

            {/* Desktop Sidebar */}
            <div className="hidden lg:fixed lg:top-12 lg:bottom-0 lg:flex lg:w-72 lg:flex-col lg:h-[calc(100%-3rem)]">
                <SidebarContent />
            </div>
        </>
    );
}
