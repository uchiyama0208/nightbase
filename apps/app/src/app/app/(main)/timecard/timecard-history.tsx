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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
            hour: "2-digit",
            minute: "2-digit",
        });
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

    return (
        <div className="space-y-3">
            <Accordion type="single" collapsible className="w-full sm:w-auto">
                <AccordionItem
                    value="filters"
                    className="rounded-2xl border border-gray-200 bg-white px-2 dark:border-gray-700 dark:bg-gray-800"
                >
                    <AccordionTrigger className="px-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <div className="flex w-full items-center justify-between pr-2">
                            <span>フィルター</span>
                            {hasFilters && (
                                <span className="text-xs text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                                    {activeFilters.join("・")}
                                </span>
                            )}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-2">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 items-center">
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                onClick={(event) => event.currentTarget.showPicker?.()}
                                className="h-10"
                                placeholder="開始日"
                            />
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                onClick={(event) => event.currentTarget.showPicker?.()}
                                className="h-10"
                                placeholder="終了日"
                            />
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
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
                <div className="min-w-full">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <TableHead className="min-w-[90px] px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400">勤務日</TableHead>
                                <TableHead className="min-w-[90px] px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400">出勤</TableHead>
                                <TableHead className="min-w-[90px] px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400">退勤</TableHead>
                                {showBreakColumns && (
                                    <>
                                        <TableHead className="hidden md:table-cell min-w-[90px] px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400">休憩開始</TableHead>
                                        <TableHead className="hidden md:table-cell min-w-[90px] px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400">休憩終了</TableHead>
                                    </>
                                )}
                                <TableHead className="min-w-[80px] px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400">勤務時間</TableHead>
                                <TableHead className="min-w-[90px] px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400">送迎先</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCards.map((card: TimeCard) => (
                                <TableRow key={card.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <TableCell className="font-medium text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white">{card.work_date}</TableCell>
                                    <TableCell className="text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white">{formatDateTime(card.clock_in)}</TableCell>
                                    <TableCell className="text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white">{formatDateTime(card.clock_out)}</TableCell>
                                    {showBreakColumns && (
                                        <>
                                            <TableCell className="hidden md:table-cell text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white">
                                                {formatDateTime(card.break_start || null)}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white">
                                                {formatDateTime(card.break_end || null)}
                                            </TableCell>
                                        </>
                                    )}
                                    <TableCell className="font-medium text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white">{calculateWorkTime(card)}</TableCell>
                                    <TableCell className="text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white">{card.pickup_destination || card.pickup_location || "-"}</TableCell>
                                </TableRow>
                            ))}
                            {filteredCards.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={showBreakColumns ? 7 : 5} className="h-24 text-center text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                        条件に一致する勤務履歴がありません
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
