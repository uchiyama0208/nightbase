"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { getAttendanceRecords } from "@/app/app/(main)/attendance/actions";

interface AttendanceRecord {
    id: string;
    user_id: string;
    work_date: string;
    clock_in: string | null;
    clock_out: string | null;
}

interface UserAttendanceListModalProps {
    isOpen: boolean;
    onClose: () => void;
    profileId: string;
    profileName: string;
    onEditRecord: (record: any) => void;
}

export function UserAttendanceListModal({
    isOpen,
    onClose,
    profileId,
    profileName,
    onEditRecord,
}: UserAttendanceListModalProps) {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    useEffect(() => {
        if (isOpen && profileId) {
            const fetchRecords = async () => {
                setIsLoading(true);
                try {
                    const data = await getAttendanceRecords(profileId);
                    setRecords(data || []);
                } catch (error) {
                    console.error("Failed to fetch records:", error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchRecords();
        }
    }, [isOpen, profileId]);

    const formatTime = (isoString: string | null) => {
        if (!isoString) return "-";
        return new Date(isoString).toLocaleTimeString("ja-JP", {
            timeZone: "Asia/Tokyo",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const filteredRecords = records.filter((record) =>
        record.work_date.startsWith(selectedMonth)
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {profileName}の勤怠
                    </DialogTitle>
                    <div className="w-8 h-8" />
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex justify-center mb-4">
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : filteredRecords.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            勤怠データがありません
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700">
                            <table className="w-full text-sm table-fixed">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium">
                                    <tr>
                                        <th className="px-4 py-3 text-center w-1/3">日付</th>
                                        <th className="px-4 py-3 text-center w-1/3">開始</th>
                                        <th className="px-4 py-3 text-center w-1/3">終了</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredRecords.map((record) => (
                                        <tr
                                            key={record.id}
                                            onClick={() => onEditRecord(record)}
                                            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-4 py-3 text-center text-gray-900 dark:text-gray-100">
                                                {new Date(record.work_date + "T00:00:00+09:00").toLocaleDateString("ja-JP", {
                                                    timeZone: "Asia/Tokyo",
                                                    month: "numeric",
                                                    day: "numeric",
                                                    weekday: "short",
                                                })}
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                                                {formatTime(record.clock_in)}
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                                                {formatTime(record.clock_out)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
