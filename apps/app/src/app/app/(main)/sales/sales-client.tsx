"use client";

import { useState, useEffect } from "react";
import { Loader2, Users, Receipt, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { SlipDetailModal } from "@/components/slips/slip-detail-modal";

interface DayData {
    date: string;
    label: string;
    sales: number;
    payments: number;
    profit: number;
}

interface SalesData {
    days: DayData[];
}

interface Slip {
    id: string;
    time: string;
    tableName: string;
    guestCount: number;
    totalAmount: number;
    status: string;
}

interface DetailData {
    slips: Slip[];
    slipCount: number;
    totalGuests: number;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0,
    }).format(amount);
}

interface SalesClientProps {
    canEdit?: boolean;
}

export function SalesClient({ canEdit = false }: SalesClientProps) {
    const [data, setData] = useState<SalesData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
    const [detailData, setDetailData] = useState<DetailData | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [selectedSlipId, setSelectedSlipId] = useState<string | null>(null);

    useEffect(() => {
        loadSalesData();
    }, []);

    const loadSalesData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/sales");
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "売上データの取得に失敗しました");
            }
            const result = await res.json();
            setData(result);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "エラーが発生しました";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const openDetail = async (day: DayData) => {
        setSelectedDay(day);
        setIsDetailLoading(true);
        setDetailData(null);

        try {
            const res = await fetch(`/api/sales/detail?date=${day.date}`);
            if (res.ok) {
                const result = await res.json();
                setDetailData(result);
            }
        } catch (err) {
            console.error("Failed to load detail:", err);
        } finally {
            setIsDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setSelectedDay(null);
        setDetailData(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">読み込み中...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <Button onClick={loadSalesData} className="mt-4 rounded-lg" variant="outline">
                    再試行
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <table className="w-full" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                        <col style={{ width: '25%' }} />
                        <col style={{ width: '25%' }} />
                        <col style={{ width: '25%' }} />
                        <col style={{ width: '25%' }} />
                    </colgroup>
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">日付</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">売上</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">支払い</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">純利益</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data?.days.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center py-8 text-muted-foreground">
                                    データがありません
                                </td>
                            </tr>
                        ) : (
                            data?.days.map((day) => (
                                <tr
                                    key={day.date}
                                    onClick={() => openDetail(day)}
                                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0"
                                >
                                    <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">{day.label}</td>
                                    <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">
                                        {formatCurrency(day.sales)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">
                                        {formatCurrency(day.payments)}
                                    </td>
                                    <td className={`px-4 py-3 text-sm text-center font-medium ${day.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                        {formatCurrency(day.profit)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Detail Modal */}
            <Dialog open={!!selectedDay} onOpenChange={(open) => !open && closeDetail()}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-0 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
                            {selectedDay?.label}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="px-6 py-4 space-y-4">
                        {/* サマリー */}
                        {selectedDay && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">売上</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(selectedDay.sales)}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">純利益</p>
                                    <p className={`text-lg font-bold ${selectedDay.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                        {formatCurrency(selectedDay.profit)}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">伝票数</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                                        {detailData?.slipCount ?? "-"}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">来店者数</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                                        {detailData?.totalGuests ?? "-"}名
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 伝票一覧 */}
                        {isDetailLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            </div>
                        ) : detailData ? (
                            <>
                                {detailData.slips.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">伝票一覧</p>
                                        {detailData.slips.map((slip) => (
                                            <div
                                                key={slip.id}
                                                onClick={() => setSelectedSlipId(slip.id)}
                                                className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {slip.time}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                                        <Receipt className="h-4 w-4" />
                                                        {slip.tableName}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                                        <Users className="h-4 w-4" />
                                                        {slip.guestCount}名
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {formatCurrency(slip.totalAmount)}
                                                    </span>
                                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        伝票がありません
                                    </p>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                データの取得に失敗しました
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Slip Detail Modal */}
            <SlipDetailModal
                isOpen={!!selectedSlipId}
                onClose={() => setSelectedSlipId(null)}
                sessionId={selectedSlipId}
                onUpdate={() => {}}
                editable={false}
            />
        </div>
    );
}

export const dynamic = 'force-dynamic';
