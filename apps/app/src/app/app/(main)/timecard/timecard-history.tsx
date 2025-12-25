"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Filter, ChevronLeft, Clock, MapPin, Coffee, FileText } from "lucide-react";
import { getTimecardDetail, TimecardDetail } from "./actions";

interface TimeCard {
    id: string;
    work_date: string;
    clock_in: string | null;
    clock_out: string | null;
    break_start?: string | null;
    break_end?: string | null;
    breaks?: { id: string; break_start: string; break_end: string | null }[];
    pickup_destination?: string | null;
    pickup_location?: string | null;
}

interface TimecardHistoryProps {
    timeCards: TimeCard[];
    showBreakColumns: boolean;
}

export function TimecardHistory({ timeCards, showBreakColumns }: TimecardHistoryProps) {
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<TimecardDetail | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    const handleRowClick = async (cardId: string) => {
        setIsLoadingDetail(true);
        setIsDetailOpen(true);
        try {
            const detail = await getTimecardDetail(cardId);
            setSelectedDetail(detail);
        } catch (error) {
            console.error("Failed to fetch timecard detail:", error);
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const formatFullDateTime = (dateString: string | null) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const activeFilters = [
        dateFrom && "開始日",
        dateTo && "終了日",
    ].filter(Boolean) as string[];
    const hasFilters = activeFilters.length > 0;

    const formatDateTime = (dateString: string | null) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatWorkDate = (clockIn: string | null, workDate: string) => {
        // clock_inがあればその日付を表示、なければwork_dateを表示
        if (clockIn) {
            const date = new Date(clockIn);
            return date.toLocaleDateString("ja-JP", {
                timeZone: "Asia/Tokyo",
                year: "numeric",
                month: "numeric",
                day: "numeric",
            });
        }
        // "2025-12-04" -> "2025/12/4"
        const [year, month, day] = workDate.split("-");
        return `${year}/${parseInt(month)}/${parseInt(day)}`;
    };

    const calculateWorkTime = (card: TimeCard) => {
        if (!card.clock_in) return "-";

        const clockIn = new Date(card.clock_in);
        const clockOut = card.clock_out ? new Date(card.clock_out) : new Date();

        let workMinutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);

        // Use breaks array if available, otherwise fallback to single break fields
        if (card.breaks && card.breaks.length > 0) {
            for (const breakItem of card.breaks) {
                if (breakItem.break_start && breakItem.break_end) {
                    const breakStart = new Date(breakItem.break_start);
                    const breakEnd = new Date(breakItem.break_end);
                    const breakMinutes = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60);
                    workMinutes -= breakMinutes;
                }
            }
        } else if (card.break_start && card.break_end) {
            const breakStart = new Date(card.break_start);
            const breakEnd = new Date(card.break_end);
            const breakMinutes = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60);
            workMinutes -= breakMinutes;
        }

        const hours = Math.floor(workMinutes / 60);
        const minutes = Math.floor(workMinutes % 60);

        return `${hours}時間${minutes}分`;
    };

    const filteredCards = useMemo(() => {
        return timeCards.filter((card) => {
            const matchesFrom = dateFrom ? card.work_date >= dateFrom : true;
            const matchesTo = dateTo ? card.work_date <= dateTo : true;

            return matchesFrom && matchesTo;
        });
    }, [timeCards, dateFrom, dateTo]);

    const getFilterSummary = () => {
        if (!hasFilters) return "なし";
        return activeFilters.join("・");
    };

    return (
        <div className="space-y-3">
            {/* Header Row */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">勤務履歴</h2>
                <button
                    type="button"
                    className={`flex items-center gap-1 px-1 py-1 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        hasFilters ? "text-blue-600" : "text-gray-500 dark:text-gray-400"
                    }`}
                    onClick={() => setIsFilterOpen(true)}
                >
                    <Filter className="h-5 w-5 shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        フィルター: {getFilterSummary()}
                    </span>
                </button>
            </div>

            {/* Filter Modal */}
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 bg-white dark:bg-gray-900">
                        <button
                            type="button"
                            onClick={() => setIsFilterOpen(false)}
                            className="p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-gray-900 dark:text-white">フィルター</DialogTitle>
                        <div className="w-7" />
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">開始日</label>
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                onClick={(event) => event.currentTarget.showPicker?.()}
                                className="h-10"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">終了日</label>
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                onClick={(event) => event.currentTarget.showPicker?.()}
                                className="h-10"
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setIsFilterOpen(false)}
                            className="w-full mt-4"
                        >
                            戻る
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <Table>
                    <TableHeader>
                        <TableRow className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <TableHead className="px-1.5 sm:px-3 text-center text-xs text-gray-500 dark:text-gray-400">日付</TableHead>
                            <TableHead className="px-1.5 sm:px-3 text-center text-xs text-gray-500 dark:text-gray-400">出勤</TableHead>
                            <TableHead className="px-1.5 sm:px-3 text-center text-xs text-gray-500 dark:text-gray-400">退勤</TableHead>
                            {showBreakColumns && (
                                <>
                                    <TableHead className="hidden md:table-cell px-1.5 sm:px-3 text-center text-xs text-gray-500 dark:text-gray-400">休憩開始</TableHead>
                                    <TableHead className="hidden md:table-cell px-1.5 sm:px-3 text-center text-xs text-gray-500 dark:text-gray-400">休憩終了</TableHead>
                                </>
                            )}
                            <TableHead className="px-1.5 sm:px-3 text-center text-xs text-gray-500 dark:text-gray-400">時間</TableHead>
                            <TableHead className="hidden sm:table-cell px-1.5 sm:px-3 text-center text-xs text-gray-500 dark:text-gray-400">送迎先</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCards.map((card: TimeCard) => (
                            <TableRow
                                key={card.id}
                                className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                                onClick={() => handleRowClick(card.id)}
                            >
                                <TableCell className="font-medium text-xs px-1.5 sm:px-3 text-center text-gray-900 dark:text-white whitespace-nowrap">{formatWorkDate(card.clock_in, card.work_date)}</TableCell>
                                <TableCell className="text-xs px-1.5 sm:px-3 text-center text-gray-900 dark:text-white">{formatDateTime(card.clock_in)}</TableCell>
                                <TableCell className="text-xs px-1.5 sm:px-3 text-center text-gray-900 dark:text-white">{formatDateTime(card.clock_out)}</TableCell>
                                {showBreakColumns && (
                                    <>
                                        <TableCell className="hidden md:table-cell text-xs px-1.5 sm:px-3 text-center text-gray-900 dark:text-white">
                                            {formatDateTime(card.break_start || null)}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-xs px-1.5 sm:px-3 text-center text-gray-900 dark:text-white">
                                            {formatDateTime(card.break_end || null)}
                                        </TableCell>
                                    </>
                                )}
                                <TableCell className="font-medium text-xs px-1.5 sm:px-3 text-center text-gray-900 dark:text-white whitespace-nowrap">{calculateWorkTime(card)}</TableCell>
                                <TableCell className="hidden sm:table-cell text-xs px-1.5 sm:px-3 text-center text-gray-900 dark:text-white truncate max-w-[80px]">{card.pickup_destination || card.pickup_location || "-"}</TableCell>
                            </TableRow>
                        ))}
                        {filteredCards.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={showBreakColumns ? 6 : 4} className="h-24 text-center text-xs text-gray-500 dark:text-gray-400">
                                    条件に一致する勤務履歴がありません
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Detail Modal */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-0 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 bg-white dark:bg-gray-900 px-4 border-b border-gray-200 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={() => setIsDetailOpen(false)}
                            className="p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-gray-900 dark:text-white">勤務詳細</DialogTitle>
                        <div className="w-7" />
                    </DialogHeader>

                    <div className="p-4">
                        {isLoadingDetail ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : selectedDetail ? (
                            <div className="space-y-4">
                                {/* Date */}
                                <div className="text-center">
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {formatWorkDate(selectedDetail.clock_in, selectedDetail.work_date)}
                                    </p>
                                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                                        selectedDetail.status === "working"
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                    }`}>
                                        {selectedDetail.status === "working" ? "勤務中" : "退勤済み"}
                                    </span>
                                </div>

                                {/* Time Info */}
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                            <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">出勤</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {formatFullDateTime(selectedDetail.clock_in)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                            <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">退勤</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {formatFullDateTime(selectedDetail.clock_out)}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Multiple breaks display */}
                                    {selectedDetail.breaks && selectedDetail.breaks.length > 0 ? (
                                        selectedDetail.breaks.map((breakItem, index) => (
                                            <div key={breakItem.id} className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                                                    <Coffee className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        休憩{selectedDetail.breaks.length > 1 ? ` ${index + 1}` : ""}
                                                    </p>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {formatFullDateTime(breakItem.break_start)} - {formatFullDateTime(breakItem.break_end)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (selectedDetail.break_start || selectedDetail.break_end) && (
                                        /* Fallback for old data without breaks array */
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                                                <Coffee className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">休憩</p>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {formatFullDateTime(selectedDetail.break_start)} - {formatFullDateTime(selectedDetail.break_end)}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {selectedDetail.pickup_destination && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                                <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">送迎先</p>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {selectedDetail.pickup_destination}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Custom Questions */}
                                {selectedDetail.questions.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-gray-500" />
                                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">カスタム項目</h3>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
                                            {selectedDetail.questions.map((q) => (
                                                <div key={`${q.id}-${q.timing}`} className="flex items-start justify-between gap-2">
                                                    <div className="flex-1">
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {q.label}
                                                            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700">
                                                                {q.timing === "clock_in" ? "出勤時" : "退勤時"}
                                                            </span>
                                                        </p>
                                                        <p className="text-sm text-gray-900 dark:text-white mt-0.5">{q.value || "-"}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Button
                                    variant="outline"
                                    onClick={() => setIsDetailOpen(false)}
                                    className="w-full"
                                >
                                    閉じる
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                データを取得できませんでした
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
