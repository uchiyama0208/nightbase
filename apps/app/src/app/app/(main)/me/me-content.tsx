"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { User, Settings, Wallet, ChevronRight, Loader2 } from "lucide-react";
import { StoreSelectorModal } from "./store-selector-modal";
import { AttendanceCalendar } from "./attendance-calendar";

interface TimeCard {
    id: string;
    work_date: string;
    clock_in: string | null;
    clock_out: string | null;
    store_name: string;
    store_icon_url: string | null;
}

interface ScheduledShift {
    id: string;
    target_date: string;
    start_time: string | null;
    end_time: string | null;
    store_name: string;
    store_icon_url: string | null;
}

interface Profile {
    id: string;
    display_name: string;
    role: string;
    stores: { id: string; name: string; icon_url?: string | null } | null;
}

interface PayrollRecord {
    date: string;
    label: string;
    profileId: string;
    name: string;
    hourlyWage: number;
    backAmount: number;
    deductionAmount: number;
    totalSalary: number;
}

interface MeContentProps {
    avatarUrl: string | null;
    displayName: string | null;
    profiles: Profile[];
    currentProfileId: string | null;
    currentStore: { id: string; name: string; icon_url?: string | null } | null;
    timeCards: TimeCard[];
    scheduledShifts: ScheduledShift[];
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0,
    }).format(amount);
}

export function MeContent({
    avatarUrl,
    displayName,
    profiles,
    currentProfileId,
    currentStore,
    timeCards,
    scheduledShifts,
}: MeContentProps) {
    const [activeTab, setActiveTab] = useState<"calendar" | "salary">("calendar");
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
    const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});

    // Payroll state
    const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
    const [payrollLoading, setPayrollLoading] = useState(false);
    const [payrollLoaded, setPayrollLoaded] = useState(false);

    useEffect(() => {
        const activeButton = tabsRef.current[activeTab];
        if (activeButton) {
            setIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
            });
        }
    }, [activeTab]);

    // Load payroll data when switching to salary tab
    useEffect(() => {
        if (activeTab === "salary" && !payrollLoaded && currentProfileId) {
            setPayrollLoading(true);
            fetch(`/api/payroll/me`)
                .then(res => res.json())
                .then(data => {
                    setPayrollRecords(data.records || []);
                    setPayrollLoaded(true);
                })
                .catch(err => {
                    console.error("Failed to load payroll:", err);
                })
                .finally(() => {
                    setPayrollLoading(false);
                });
        }
    }, [activeTab, payrollLoaded, currentProfileId]);

    return (
        <div className="max-w-2xl mx-auto">
            {/* Compact Profile Header */}
            <div className="flex items-center gap-3">
                {avatarUrl ? (
                    <Image
                        src={avatarUrl}
                        alt={displayName || ""}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                        {displayName || "名前未設定"}
                    </h1>
                </div>
                {/* Store Selector Card */}
                <StoreSelectorModal
                    profiles={profiles}
                    currentProfileId={currentProfileId}
                    currentStoreName={currentStore?.name || null}
                    currentStoreIcon={currentStore?.icon_url || null}
                />
                <Link
                    href="/app/me/settings"
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
            </div>

            {/* Tab Navigation - Vercel Style */}
            <div className="mt-4 border-b border-gray-200 dark:border-gray-700">
                <nav className="relative flex gap-6">
                    <button
                        ref={(el) => { tabsRef.current["calendar"] = el; }}
                        type="button"
                        onClick={() => setActiveTab("calendar")}
                        className={`relative pb-3 text-sm font-medium transition-colors duration-200 ${
                            activeTab === "calendar"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        カレンダー
                    </button>
                    <button
                        ref={(el) => { tabsRef.current["salary"] = el; }}
                        type="button"
                        onClick={() => setActiveTab("salary")}
                        className={`relative pb-3 text-sm font-medium transition-colors duration-200 ${
                            activeTab === "salary"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        給与
                    </button>
                    {/* Animated indicator */}
                    <span
                        className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-300 ease-out"
                        style={{
                            left: indicatorStyle.left,
                            width: indicatorStyle.width,
                        }}
                    />
                </nav>
            </div>

            {/* Content */}
            <div className="mt-4">
                {activeTab === "calendar" ? (
                    <AttendanceCalendar timeCards={timeCards} scheduledShifts={scheduledShifts} />
                ) : (
                    <div className="space-y-3">
                        {payrollLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                            </div>
                        ) : payrollRecords.length === 0 ? (
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                                <Wallet className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400">
                                    給与データがありません
                                </p>
                            </div>
                        ) : (
                            payrollRecords.map((record, index) => (
                                <div
                                    key={`${record.date}_${index}`}
                                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {record.label}
                                            </p>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                <span>時給: {formatCurrency(record.hourlyWage)}</span>
                                                {record.backAmount > 0 && (
                                                    <span className="text-emerald-600 dark:text-emerald-400">
                                                        +{formatCurrency(record.backAmount)}
                                                    </span>
                                                )}
                                                {record.deductionAmount > 0 && (
                                                    <span className="text-red-500 dark:text-red-400">
                                                        -{formatCurrency(record.deductionAmount)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-base font-semibold ${
                                                record.totalSalary >= 0
                                                    ? "text-gray-900 dark:text-white"
                                                    : "text-red-600 dark:text-red-400"
                                            }`}>
                                                {formatCurrency(record.totalSalary)}
                                            </span>
                                            <ChevronRight className="h-4 w-4 text-gray-400" />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
