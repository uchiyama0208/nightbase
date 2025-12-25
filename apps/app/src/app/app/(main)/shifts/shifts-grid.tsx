"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getGridData, type GridData, type GridCellData } from "./actions";

interface ShiftsGridProps {
    storeId: string;
    refreshKey?: number;
    onDateClick?: (date: string, requestDateId?: string) => void;
    onCellClick?: (date: string, profileId: string, profileName: string, cell: GridCellData | null, requestDateId?: string) => void;
    onProfileClick?: (profileId: string) => void;
}

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

function getStatusColor(status: GridCellData["status"]): string {
    switch (status) {
        case "scheduled":
            return "text-blue-600 dark:text-blue-400";
        case "pending":
            return "text-yellow-600 dark:text-yellow-400";
        default:
            return "";
    }
}

function shouldShowCell(status: GridCellData["status"]): boolean {
    return status === "scheduled" || status === "pending";
}

export function ShiftsGrid({ storeId, refreshKey, onDateClick, onCellClick, onProfileClick }: ShiftsGridProps) {
    const [isPending, startTransition] = useTransition();
    const [gridData, setGridData] = useState<GridData | null>(null);
    const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
    const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);
    const [roleFilter, setRoleFilter] = useState<"cast" | "staff">("cast");
    const [isHeaderSticky, setIsHeaderSticky] = useState(false);
    const headerRef = useRef<HTMLTableSectionElement>(null);
    const bodyScrollRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const stickyHeaderScrollLeft = useRef(0);
    const isInitialLoad = useRef(true);

    // stickyヘッダーのref callback - マウント時に即座にスクロール位置を設定
    const stickyHeaderRef = useCallback((node: HTMLDivElement | null) => {
        if (node) {
            node.scrollLeft = stickyHeaderScrollLeft.current;
        }
    }, []);

    const loadData = (year: number, month: number, role: "cast" | "staff") => {
        startTransition(async () => {
            const data = await getGridData(storeId, year, month, role);
            setGridData(data);
        });
    };

    // 初回・月変更・フィルター変更時はローディング表示
    useEffect(() => {
        loadData(currentYear, currentMonth, roleFilter);
    }, [storeId, currentYear, currentMonth, roleFilter]);

    // refreshKey変更時はバックグラウンド更新
    const prevRefreshKey = useRef(refreshKey);
    useEffect(() => {
        if (prevRefreshKey.current !== refreshKey && prevRefreshKey.current !== undefined) {
            // バックグラウンドでデータを更新（ローディング表示なし）
            (async () => {
                const data = await getGridData(storeId, currentYear, currentMonth, roleFilter);
                setGridData(data);
            })();
        }
        prevRefreshKey.current = refreshKey;
    }, [refreshKey, storeId, currentYear, currentMonth, roleFilter]);

    // ヘッダーがビューポートから出たらstickyヘッダーを表示
    useEffect(() => {
        const handleScroll = () => {
            if (!headerRef.current || !containerRef.current) return;

            const headerRect = headerRef.current.getBoundingClientRect();
            const containerRect = containerRef.current.getBoundingClientRect();
            const mobileHeaderHeight = 48; // h-12 = 3rem = 48px

            // ヘッダーがモバイルヘッダーの下に隠れたらstickyを表示
            // かつ、コンテナがまだ画面内にある場合のみ
            const shouldBeSticky = headerRect.top < mobileHeaderHeight && containerRect.bottom > mobileHeaderHeight + 50;
            setIsHeaderSticky(shouldBeSticky);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();

        return () => window.removeEventListener("scroll", handleScroll);
    }, [gridData]);

    // 横スクロールの同期
    const handleBodyScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        stickyHeaderScrollLeft.current = scrollLeft;
        // stickyヘッダーが表示中なら同期
        const stickyEl = document.getElementById("sticky-header-scroll");
        if (stickyEl) {
            stickyEl.scrollLeft = scrollLeft;
        }
    }, []);

    // 初回読み込み完了時のみ今日の日付にスクロール
    useEffect(() => {
        if (!gridData || isPending || !isInitialLoad.current) return;
        isInitialLoad.current = false;

        const today = new Date().toLocaleDateString("ja-JP", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).replace(/\//g, "-");

        const todayIndex = gridData.dates.indexOf(today);
        if (todayIndex !== -1 && bodyScrollRef.current) {
            const nameColumnWidth = 100;
            const cellWidth = 40;
            const scrollPosition = nameColumnWidth + ((todayIndex + 1) * cellWidth) - (bodyScrollRef.current.clientWidth / 2) + (cellWidth / 2);
            const newScrollLeft = Math.max(0, scrollPosition);
            bodyScrollRef.current.scrollLeft = newScrollLeft;
            stickyHeaderScrollLeft.current = newScrollLeft;
            const stickyEl = document.getElementById("sticky-header-scroll");
            if (stickyEl) {
                stickyEl.scrollLeft = newScrollLeft;
            }
        }
    }, [gridData, isPending]);

    const handlePrevMonth = () => {
        if (currentMonth === 1) {
            setCurrentYear(currentYear - 1);
            setCurrentMonth(12);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 12) {
            setCurrentYear(currentYear + 1);
            setCurrentMonth(1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const getDayOfWeek = (dateStr: string): number => {
        return new Date(dateStr).getDay();
    };

    const isToday = (dateStr: string): boolean => {
        const today = new Date().toLocaleDateString("ja-JP", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).replace(/\//g, "-");
        return dateStr === today;
    };

    if (!gridData) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    const renderHeaderRow = (clickable = false) => (
        <tr>
            <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[100px] w-[100px] relative after:content-[''] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[1px] after:bg-gray-300 dark:after:bg-gray-600">
                名前
            </th>
            {gridData.dates.map((date) => {
                const day = parseInt(date.split("-")[2], 10);
                const dayOfWeek = getDayOfWeek(date);
                const isSunday = dayOfWeek === 0;
                const isSaturday = dayOfWeek === 6;
                const todayBg = isToday(date) ? "bg-blue-100 dark:bg-blue-900/40" : "bg-gray-50 dark:bg-gray-800";

                return (
                    <th
                        key={date}
                        className={`border-b border-gray-200 dark:border-gray-700 p-1 text-center min-w-[40px] w-[40px] ${todayBg} ${clickable ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" : ""}`}
                        onClick={clickable ? () => onDateClick?.(date, gridData.requestDateIds[date]) : undefined}
                    >
                        <div className="flex flex-col items-center">
                            <span className={`text-[10px] ${
                                isSunday ? "text-red-500" : isSaturday ? "text-blue-500" : "text-gray-400 dark:text-gray-500"
                            }`}>
                                {DAY_NAMES[dayOfWeek]}
                            </span>
                            <span className={`text-xs font-medium ${
                                isSunday ? "text-red-500" : isSaturday ? "text-blue-500" : "text-gray-900 dark:text-white"
                            }`}>
                                {day}
                            </span>
                        </div>
                    </th>
                );
            })}
        </tr>
    );

    return (
        <>
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-3">
                <button
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    {currentYear}年{currentMonth}月
                </h2>
                <button
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
            </div>

            {/* Role Tags & Legend */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setRoleFilter("cast")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                            roleFilter === "cast"
                                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                    >
                        キャスト
                    </button>
                    <button
                        type="button"
                        onClick={() => setRoleFilter("staff")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                            roleFilter === "staff"
                                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                    >
                        スタッフ
                    </button>
                </div>
                <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span>確定</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                        <span>未確認</span>
                    </div>
                </div>
            </div>

            {/* Sticky Header (固定ヘッダー) */}
            {isHeaderSticky && gridData.profiles.length > 0 && (
                <div
                    className="fixed top-12 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm lg:pl-72"
                >
                    <div
                        id="sticky-header-scroll"
                        ref={stickyHeaderRef}
                        className="overflow-x-auto scrollbar-hide mx-4"
                        style={{ pointerEvents: "none" }}
                    >
                        <table className="w-full border-collapse">
                            <thead>
                                {renderHeaderRow()}
                            </thead>
                        </table>
                    </div>
                </div>
            )}

            {/* Grid Container */}
            <div ref={containerRef} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                {isPending ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                ) : gridData.profiles.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        表示するメンバーがいません
                    </div>
                ) : (
                    <div
                        ref={bodyScrollRef}
                        className="overflow-x-auto"
                        onScroll={handleBodyScroll}
                    >
                        <table className="w-full border-collapse">
                            <thead ref={headerRef}>
                                {renderHeaderRow(true)}
                            </thead>
                            <tbody>
                                {gridData.profiles.map((profile) => (
                                    <tr key={profile.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        {/* Name cell */}
                                        <td
                                            className="sticky left-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-2 min-w-[100px] w-[100px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative after:content-[''] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[1px] after:bg-gray-300 dark:after:bg-gray-600"
                                            onClick={() => onProfileClick?.(profile.id)}
                                        >
                                            <div className="flex items-center gap-1">
                                                {profile.avatar_url ? (
                                                    <img
                                                        src={profile.avatar_url}
                                                        alt=""
                                                        className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                            {profile.display_name?.charAt(0) || "?"}
                                                        </span>
                                                    </div>
                                                )}
                                                <span className="text-xs text-gray-900 dark:text-white truncate max-w-[50px]">
                                                    {profile.display_name || "名前なし"}
                                                </span>
                                                {profile.status === "体入" && (
                                                    <span className="text-[10px] px-1 py-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 flex-shrink-0">
                                                        体入
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        {/* Date cells */}
                                        {gridData.dates.map((date) => {
                                            const cell = gridData.cells[profile.id]?.[date] || null;
                                            const showCell = cell && shouldShowCell(cell.status);
                                            const todayClass = isToday(date) ? "bg-blue-50 dark:bg-blue-900/20" : "";
                                            const startTimeDisplay = cell?.startTime ? cell.startTime.slice(0, 5) : "";

                                            return (
                                                <td
                                                    key={date}
                                                    className={`border-b border-gray-200 dark:border-gray-700 p-0.5 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-[40px] w-[40px] ${todayClass}`}
                                                    onClick={() => onCellClick?.(date, profile.id, profile.display_name || "名前なし", cell, gridData.requestDateIds[date])}
                                                >
                                                    {showCell && (
                                                        <span
                                                            className={`text-[10px] font-medium ${getStatusColor(cell.status)}`}
                                                            title={cell.endTime ? `${startTimeDisplay}〜${cell.endTime.slice(0, 5)}` : startTimeDisplay}
                                                        >
                                                            {startTimeDisplay || "-"}
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
