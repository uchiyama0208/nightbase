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
    Calendar,
    Car,
    LayoutGrid,
    Coins,
    Wallet,
    BarChart3,
    Trophy,
    FileText,
    ClipboardList,
    CalendarRange,
    ShoppingCart,
    Sparkles,
    QrCode,
    Store,
    User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useState, useRef } from "react";
import type { StoreFeatures } from "@/app/app/data-access";

interface SidebarProps {
    userRole?: string;
    profileName?: string;
    storeName?: string;
    storeFeatures?: StoreFeatures | null;
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
    const [internalOpen, setInternalOpen] = useState(false);

    const shiftContentRef = useRef<HTMLDivElement>(null);
    const userContentRef = useRef<HTMLDivElement>(null);
    const floorContentRef = useRef<HTMLDivElement>(null);
    const salaryContentRef = useRef<HTMLDivElement>(null);
    const communityContentRef = useRef<HTMLDivElement>(null);

    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = onOpenChange || setInternalOpen;

    // シフト
    const shiftRoutes = [
        {
            label: "出勤管理",
            icon: Calendar,
            href: "/app/attendance",
            key: "attendance",
        },
        {
            label: "送迎管理",
            icon: Car,
            href: "/app/pickup",
            key: "pickup",
        },
        {
            label: "タイムカード",
            icon: Clock,
            href: "/app/timecard",
            key: "timecard",
        },
        {
            label: "シフト管理",
            icon: CalendarCheck,
            href: "/app/shifts",
            key: "shifts",
        },
        {
            label: "マイシフト",
            icon: CalendarClock,
            href: "/app/my-shifts",
            key: "my-shifts",
        },
    ];

    // ユーザー
    const userRoutes = [
        {
            label: "プロフィール情報",
            icon: Users,
            href: "/app/users",
            key: "users",
        },
        {
            label: "履歴書",
            icon: FileText,
            href: "/app/resumes",
            key: "resumes",
        },
        {
            label: "招待",
            icon: Mail,
            href: "/app/invitations",
            key: "invitations",
        },
    ];

    // フロア
    const floorRoutes = [
        {
            label: "フロア管理",
            icon: LayoutGrid,
            href: "/app/floor",
            key: "floor",
        },
        {
            label: "注文一覧",
            icon: ClipboardList,
            href: "/app/orders",
            key: "orders",
        },
        {
            label: "順番待ち",
            icon: Grid3X3,
            href: "/app/queue",
            key: "queue",
        },
        {
            label: "予約",
            icon: CalendarRange,
            href: "/app/reservations",
            key: "reservations",
        },
        {
            label: "席エディター",
            icon: Armchair,
            href: "/app/seats",
            key: "seats",
        },
        {
            label: "伝票",
            icon: Receipt,
            href: "/app/slips",
            key: "slips",
        },
        {
            label: "メニュー",
            icon: Utensils,
            href: "/app/menus",
            key: "menus",
        },
        {
            label: "ボトルキープ",
            icon: Wine,
            href: "/app/bottles",
            key: "bottles",
        },
        {
            label: "買い出し",
            icon: ShoppingCart,
            href: "/app/shopping",
            key: "shopping",
        },
    ];

    // 料金給与
    const salaryRoutes = [
        {
            label: "売上",
            icon: BarChart3,
            href: "/app/sales",
            key: "sales",
        },
        {
            label: "給与",
            icon: Banknote,
            href: "/app/payroll",
            key: "payroll",
        },
        {
            label: "ランキング",
            icon: Trophy,
            href: "/app/ranking",
            key: "ranking",
        },
        {
            label: "料金システム",
            icon: Coins,
            href: "/app/pricing-systems",
            key: "pricing-systems",
        },
        {
            label: "給与システム",
            icon: Wallet,
            href: "/app/salary-systems",
            key: "salary-systems",
        },
    ];

    // コミュニティ
    const communityRoutes = [
        {
            label: "掲示板",
            icon: MessageSquare,
            href: "/app/board",
            key: "board",
        },
        {
            label: "SNS投稿",
            icon: Share2,
            href: "/app/sns",
            key: "sns",
        },
        {
            label: "AIクリエイト",
            icon: Sparkles,
            href: "/app/ai-create",
            key: "ai-create",
        },
    ];


    // admin と staff は全ページにアクセス可能、cast は権限セットに基づく
    const isAdminOrStaff = userRole === "admin" || userRole === "staff";

    // Helper to check if a feature is visible
    const isFeatureVisible = (key: string): boolean => {
        if (!storeFeatures) return true;
        const featureKey = `show_${key.replace(/-/g, "_")}` as keyof StoreFeatures;
        return storeFeatures[featureKey] ?? true;
    };

    // Filter routes based on role and feature visibility
    const filteredShiftRoutes = shiftRoutes
        .filter(r => isFeatureVisible(r.key))
        .filter(r => isAdminOrStaff || ["timecard", "my-shifts"].includes(r.key));

    const filteredUserRoutes = isAdminOrStaff
        ? userRoutes.filter(r => isFeatureVisible(r.key))
        : [];

    const filteredFloorRoutes = isAdminOrStaff
        ? floorRoutes.filter(r => isFeatureVisible(r.key))
        : [];

    const filteredSalaryRoutes = isAdminOrStaff
        ? salaryRoutes.filter(r => isFeatureVisible(r.key))
        : [];

    const filteredCommunityRoutes = communityRoutes
        .filter(r => isFeatureVisible(r.key))
        .filter(r => isAdminOrStaff || ["board"].includes(r.key));

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
                    className="w-full flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
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
                                    "flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
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
                    {/* シフト管理 */}
                    {renderAccordion("シフト管理", Calendar, shiftOpen, setShiftOpen, shiftContentRef, filteredShiftRoutes)}

                    {/* ユーザー */}
                    {renderAccordion("ユーザー", Users, userOpen, setUserOpen, userContentRef, filteredUserRoutes)}

                    {/* フロア */}
                    {renderAccordion("フロア", LayoutGrid, floorOpen, setFloorOpen, floorContentRef, filteredFloorRoutes)}

                    {/* 料金給与 */}
                    {renderAccordion("料金給与", Coins, salaryOpen, setSalaryOpen, salaryContentRef, filteredSalaryRoutes)}

                    {/* コミュニティ */}
                    {renderAccordion("コミュニティ", MessageSquare, communityOpen, setCommunityOpen, communityContentRef, filteredCommunityRoutes)}

                    {/* 店舗設定 */}
                    {isAdminOrStaff && (
                        <Link
                            href="/app/settings"
                            onClick={() => setOpen(false)}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
                                pathname?.startsWith("/app/settings") ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                            )}
                        >
                            <Settings className="h-5 w-5" />
                            店舗設定
                        </Link>
                    )}

                    {/* マイページ */}
                    <Link
                        href="/app/me"
                        onClick={() => setOpen(false)}
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
                            pathname === "/app/me" ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                        )}
                    >
                        <User className="h-5 w-5" />
                        マイページ
                    </Link>
                </nav>
            </div>
            {!isMobile && (
                <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    {(profileName || storeName) && (
                        <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                            {profileName && (
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{profileName}</p>
                            )}
                            {storeName && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{storeName}</p>
                            )}
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
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
