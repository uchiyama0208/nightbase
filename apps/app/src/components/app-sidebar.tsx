"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
    CalendarDays,
    Clock,
    Users,
    Settings,
    LogOut,
    Shield,
    Utensils,
    Mail,
    ChevronDown,
    UserPlus,
    Wine,
    Armchair,
    Receipt,
    Grid3X3,
    CircleDollarSign,
    Banknote,
    CalendarCheck,
    CalendarClock,
    MessageSquare,
    Share2,
    Sparkles,
    Calendar,
    Car,
    LayoutGrid,
    Coins,
    Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useState, useRef } from "react";

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
    const [shiftOpen, setShiftOpen] = useState(false);
    const [userOpen, setUserOpen] = useState(false);
    const [floorOpen, setFloorOpen] = useState(false);
    const [salaryOpen, setSalaryOpen] = useState(false);
    const [communityOpen, setCommunityOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [internalOpen, setInternalOpen] = useState(false);

    const shiftContentRef = useRef<HTMLDivElement>(null);
    const userContentRef = useRef<HTMLDivElement>(null);
    const floorContentRef = useRef<HTMLDivElement>(null);
    const salaryContentRef = useRef<HTMLDivElement>(null);
    const communityContentRef = useRef<HTMLDivElement>(null);
    const settingsContentRef = useRef<HTMLDivElement>(null);

    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = onOpenChange || setInternalOpen;

    // シフト
    const shiftRoutes = [
        {
            label: "出勤管理",
            icon: Calendar,
            href: "/app/attendance",
            roles: ["admin", "staff"],
            feature: "attendance" as const,
        },
        {
            label: "送迎管理",
            icon: Car,
            href: "/app/pickup",
            roles: ["admin", "staff"],
        },
        {
            label: "タイムカード",
            icon: Clock,
            href: "/app/timecard",
            roles: ["admin", "staff", "cast"],
            feature: "timecard" as const,
        },
        {
            label: "シフト管理",
            icon: CalendarCheck,
            href: "/app/shifts",
            roles: ["admin", "staff"],
        },
        {
            label: "マイシフト",
            icon: CalendarClock,
            href: "/app/my-shifts",
            roles: ["admin", "staff", "cast"],
        },
    ];

    // ユーザー
    const userRoutes = [
        {
            label: "プロフィール情報",
            icon: Users,
            href: "/app/users",
            roles: ["admin", "staff"],
            feature: "users" as const,
        },
        {
            label: "権限",
            icon: Shield,
            href: "/app/roles",
            roles: ["admin", "staff"],
            feature: "roles" as const,
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
            href: "/app/invitations/join-requests",
            roles: ["admin", "staff"],
        },
    ];

    // フロア
    const floorRoutes = [
        {
            label: "フロア管理",
            icon: LayoutGrid,
            href: "/app/floor",
            roles: ["admin", "staff"],
        },
        {
            label: "席エディター",
            icon: Armchair,
            href: "/app/seats",
            roles: ["admin", "staff"],
        },
        {
            label: "伝票",
            icon: Receipt,
            href: "/app/slips",
            roles: ["admin", "staff"],
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
    ];

    // 料金給与
    const salaryRoutes = [
        {
            label: "料金体系",
            icon: Coins,
            href: "/app/pricing-systems",
            roles: ["admin", "staff"],
        },
        {
            label: "給与体系",
            icon: Wallet,
            href: "/app/salary-systems",
            roles: ["admin", "staff"],
        },
    ];

    // コミュニティ
    const communityRoutes = [
        {
            label: "掲示板",
            icon: MessageSquare,
            href: "/app/board",
            roles: ["admin", "staff", "cast"],
        },
        {
            label: "SNS",
            icon: Share2,
            href: "/app/sns",
            roles: ["admin", "staff"],
        },
        {
            label: "機能追加",
            icon: Sparkles,
            href: "/app/features",
            roles: ["admin", "staff"],
        },
    ];

    // 設定
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
            label: "招待",
            icon: Mail,
            href: "/app/invitations",
            roles: ["admin", "staff"],
        },
        {
            label: "参加申請",
            icon: UserPlus,
            href: "/app/invitations/join-requests",
            roles: ["admin", "staff"],
        },
    ];

    const filterRoutes = (routes: any[]) => {
        return routes.filter((route) => {
            if (!userRole || !route.roles.includes(userRole)) return false;
            if (!storeFeatures) return true;
            if (route.feature === "attendance" && storeFeatures.show_attendance === false) return false;
            if (route.feature === "timecard" && storeFeatures.show_timecard === false) return false;
            if (route.feature === "users" && storeFeatures.show_users === false) return false;
            if (route.feature === "roles" && storeFeatures.show_roles === false) return false;
            if (route.feature === "menus" && storeFeatures.show_menus === false) return false;
            return true;
        });
    };

    const filteredShiftRoutes = filterRoutes(shiftRoutes);
    const filteredUserRoutes = filterRoutes(userRoutes);
    const filteredFloorRoutes = filterRoutes(floorRoutes);
    const filteredSalaryRoutes = filterRoutes(salaryRoutes);
    const filteredCommunityRoutes = filterRoutes(communityRoutes);
    const filteredSettingsRoutes = filterRoutes(settingsRoutes);

    const handleSignOut = async () => {
        const { signOut } = await import("@/app/app/(main)/settings/actions");
        await signOut();
    };

    const renderAccordion = (
        label: string,
        icon: any,
        isOpen: boolean,
        setIsOpen: (open: boolean) => void,
        contentRef: React.RefObject<HTMLDivElement | null>,
        routes: any[]
    ) => {
        if (routes.length === 0) return null;
        const Icon = icon;
        return (
            <div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                >
                    <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span>{label}</span>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isOpen ? "rotate-180" : "")} />
                </button>

                <div
                    style={{
                        height: isOpen ? contentRef.current?.scrollHeight || 'auto' : 0,
                        overflow: 'hidden',
                        transition: 'height 0.3s ease-out',
                    }}
                >
                    <div ref={contentRef} className="mt-1 ml-4 space-y-1 border-l-2 border-gray-100 dark:border-gray-700 pl-2">
                        {routes.map((route) => (
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
                </div>
            </div>
        );
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
                    {/* シフト */}
                    {renderAccordion("シフト", Calendar, shiftOpen, setShiftOpen, shiftContentRef, filteredShiftRoutes)}

                    {/* ユーザー */}
                    {renderAccordion("ユーザー", Users, userOpen, setUserOpen, userContentRef, filteredUserRoutes)}

                    {/* フロア */}
                    {renderAccordion("フロア", LayoutGrid, floorOpen, setFloorOpen, floorContentRef, filteredFloorRoutes)}

                    {/* 料金給与 */}
                    {renderAccordion("料金給与", Coins, salaryOpen, setSalaryOpen, salaryContentRef, filteredSalaryRoutes)}

                    {/* コミュニティ */}
                    {renderAccordion("コミュニティ", MessageSquare, communityOpen, setCommunityOpen, communityContentRef, filteredCommunityRoutes)}

                    {/* 設定 */}
                    {renderAccordion("設定", Settings, settingsOpen, setSettingsOpen, settingsContentRef, filteredSettingsRoutes)}
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
