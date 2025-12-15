"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Filter } from "lucide-react";

interface TimeCard {
    id: string;
    work_date: string;
    clock_in: string | null;
    clock_out: string | null;
    break_start?: string | null;
    break_end?: string | null;
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
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const activeFilters = [
        dateFrom && "開始日",
        dateTo && "終了日",
        statusFilter !== "all" && (statusFilter === "working" ? "出勤中" : "退勤済み"),
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

    const formatWorkDate = (dateString: string) => {
        // "2025-12-04" -> "2025/12/4"
        const [year, month, day] = dateString.split("-");
        return `${year}/${parseInt(month)}/${parseInt(day)}`;
    };

    const calculateWorkTime = (card: TimeCard) => {
        if (!card.clock_in) return "-";

        const clockIn = new Date(card.clock_in);
        const clockOut = card.clock_out ? new Date(card.clock_out) : new Date();

        let workMinutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);

        if (card.break_start && card.break_end) {
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
            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "working" ? !card.clock_out : Boolean(card.clock_out));

            const matchesFrom = dateFrom ? card.work_date >= dateFrom : true;
            const matchesTo = dateTo ? card.work_date <= dateTo : true;

            return matchesStatus && matchesFrom && matchesTo;
        });
    }, [timeCards, statusFilter, dateFrom, dateTo]);

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
                    className={`flex items-center gap-1 px-1 py-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
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
                <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">フィルター</DialogTitle>
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
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">ステータス</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="ステータス" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">すべて</SelectItem>
                                    <SelectItem value="working">出勤中</SelectItem>
                                    <SelectItem value="done">退勤済み</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
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
                            <TableRow key={card.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <TableCell className="font-medium text-xs px-1.5 sm:px-3 text-center text-gray-900 dark:text-white whitespace-nowrap">{formatWorkDate(card.work_date)}</TableCell>
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
        </div>
    );
}
