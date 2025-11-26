"use client";

import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { createAttendance } from "./actions";
import { updateAttendance } from "./actions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface AttendanceRecord {
    id: string;
    user_id: string;
    name?: string;
    date: string;
    status: string;
    start_time: string | null;
    end_time: string | null;
    clock_in?: string | null;
    clock_out?: string | null;
    clock_in_time?: string | null;
    clock_out_time?: string | null;
    isVirtual?: boolean;
}

interface Profile {
    id: string;
    display_name: string | null;
    display_name_kana?: string | null;
    real_name: string | null;
    role: string;
}

import Link from "next/link";
import { Plus } from "lucide-react";

import { AttendanceModal } from "./attendance-modal";
import { UserEditModal } from "../users/user-edit-modal";

interface AttendanceTableProps {
    attendanceRecords: AttendanceRecord[];
    profiles: Profile[];
    roleFilter: string;
}

export function AttendanceTable({ attendanceRecords, profiles, roleFilter: initialRoleFilter }: AttendanceTableProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalInitialData, setModalInitialData] = useState<{
        profileId?: string;
        date?: string;
        status?: string;
        startTime?: string;
        endTime?: string;
    } | null>(null);
    const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

    const [nameQuery, setNameQuery] = useState("");
    const [dateQuery, setDateQuery] = useState("");
    const [workingOnly, setWorkingOnly] = useState(false);
    const [roleFilter, setRoleFilter] = useState(initialRoleFilter);

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileForEdit, setProfileForEdit] = useState<Profile | null>(null);

    const tableProfiles = profiles.filter((p) => {
        if (roleFilter === "cast") return p.role === "cast";
        return p.role === "staff" || p.role === "admin";
    });

    const profileMap: Record<string, Profile> = {};
    for (const p of profiles) {
        profileMap[p.id] = p;
    }

    const handleOpenProfileEdit = (profileId: string) => {
        const profile = profileMap[profileId];
        if (!profile) return;
        setProfileForEdit(profile);
        setIsProfileModalOpen(true);
    };

    const handleFocusAttendanceForProfile = (profileId: string) => {
        const profile = profileMap[profileId];
        if (!profile) return;
        const name =
            profile.display_name_kana ||
            profile.display_name ||
            profile.real_name ||
            "";
        setNameQuery(name);
    };

    const filteredRecords = attendanceRecords.filter((record) => {
        if (!record.user_id) return false;
        const profile = profileMap[record.user_id];
        if (!profile) return false;

        // Filter by role for the table view
        if (roleFilter === "cast" && profile.role !== "cast") return false;
        if (roleFilter === "staff" && profile.role !== "staff" && profile.role !== "admin") return false;

        if (nameQuery.trim()) {
            const term = nameQuery.trim().toLowerCase();
            const target = (
                profile.display_name_kana ||
                profile.display_name ||
                profile.real_name ||
                ""
            ).toLowerCase();
            if (!target.includes(term)) return false;
        }

        if (dateQuery && record.date !== dateQuery) return false;
        if (workingOnly && record.status !== "working") return false;
        return true;
    });

    const formatTime = (timeString: string | null) => {
        if (!timeString) return "-";
        const match = /^\d{2}:\d{2}(?::\d{2})?$/.test(timeString);
        if (match) return timeString.slice(0, 5);
        const date = new Date(timeString);
        if (isNaN(date.getTime())) return "-";
        return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    };

    const formatDate = (dateString: string) => {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return (
            <>
                <span className="md:hidden">
                    {d.toLocaleDateString("ja-JP", {
                        month: "numeric",
                        day: "numeric",
                        weekday: "short",
                    })}
                </span>
                <span className="hidden md:inline">
                    {d.toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        weekday: "short",
                    })}
                </span>
            </>
        );
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; color: string }> = {
            scheduled: { label: "予定", color: "bg-blue-100 text-blue-800" },
            working: { label: "出勤中", color: "bg-green-100 text-green-800" },
            finished: { label: "完了", color: "bg-gray-100 text-gray-800" },
            absent: { label: "欠勤", color: "bg-red-100 text-red-800" },
            forgot_clockout: { label: "退勤忘れ", color: "bg-yellow-100 text-yellow-800" },
        };
        const config = statusConfig[status] ?? { label: status, color: "bg-gray-100 text-gray-800" };
        return (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color} whitespace-nowrap`}>
                {config.label}
            </span>
        );
    };

    const handleModalOpen = (options: { initialData?: any; record?: AttendanceRecord } = {}) => {
        setModalInitialData(options.initialData || null);
        setEditingRecord(options.record || null);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setModalInitialData(null);
        setEditingRecord(null);
    };

    const activeFilters = [
        nameQuery.trim() && "名前",
        dateQuery && "日付",
        workingOnly && "出勤中のみ",
    ].filter(Boolean) as string[];
    const hasFilters = activeFilters.length > 0;

    return (
        <>
            <div className="flex flex-col gap-3 mb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 text-xs">
                            <button
                                type="button"
                                onClick={() => setRoleFilter("cast")}
                                className={`px-4 h-full flex items-center rounded-full font-medium transition-colors ${roleFilter === "cast" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`}
                            >
                                キャスト
                            </button>
                            <button
                                type="button"
                                onClick={() => setRoleFilter("staff")}
                                className={`px-4 h-full flex items-center rounded-full font-medium transition-colors ${roleFilter === "staff" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`}
                            >
                                スタッフ
                            </button>
                        </div>
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
                                        <input
                                            type="text"
                                            placeholder="名前で検索"
                                            value={nameQuery}
                                            onChange={(e) => setNameQuery(e.target.value)}
                                            className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-xs md:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <input
                                            type="date"
                                            value={dateQuery}
                                            onChange={(e) => setDateQuery(e.target.value)}
                                            className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-xs md:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <label className="flex items-center justify-center gap-1.5 text-xs md:text-sm text-gray-600 dark:text-gray-300 cursor-pointer h-10 rounded-md border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={workingOnly}
                                                onChange={(e) => setWorkingOnly(e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                                                style={{ accentColor: '#2563eb' }}
                                            />
                                            <span className="whitespace-nowrap">出勤中のみ</span>
                                        </label>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                    <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 rounded-full bg-white border-blue-500 hover:bg-blue-50 dark:bg-gray-800 dark:border-blue-400 dark:hover:bg-gray-700"
                        onClick={() => handleModalOpen()}
                    >
                        <Plus className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                    </Button>
                </div>
            </div>
            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <TableHead className="px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/7 whitespace-nowrap">日付</TableHead>
                            <TableHead className="px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/7 whitespace-nowrap">名前</TableHead>
                            <TableHead className="px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/7 whitespace-nowrap">開始</TableHead>
                            <TableHead className="px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/7 whitespace-nowrap">終了</TableHead>
                            <TableHead className="px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/7 whitespace-nowrap">送迎先</TableHead>
                            <TableHead className="hidden md:table-cell px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/7 whitespace-nowrap">状態</TableHead>
                            <TableHead className="hidden md:table-cell px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/7 whitespace-nowrap">打刻出勤</TableHead>
                            <TableHead className="hidden md:table-cell px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/7 whitespace-nowrap">打刻退勤</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRecords.map((record) => {
                            if (!record.user_id) return null;
                            const profile = profileMap[record.user_id];
                            const displayName = profile ? (profile.display_name || profile.real_name || "不明") : "不明";

                            return (
                                <TableRow
                                    key={record.id}
                                    className="cursor-pointer border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    onClick={() => {
                                        if (record.isVirtual) {
                                            handleModalOpen({
                                                initialData: {
                                                    profileId: record.user_id,
                                                    date: record.date,
                                                    status: record.status,
                                                    startTime: record.clock_in_time ? record.clock_in_time.slice(0, 5) : "",
                                                    endTime: record.clock_out_time ? record.clock_out_time.slice(0, 5) : "",
                                                }
                                            });
                                        } else {
                                            handleModalOpen({ record: record });
                                        }
                                    }}
                                >
                                    <TableCell className="font-medium text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white whitespace-nowrap">
                                        {formatDate(record.date)}
                                    </TableCell>
                                    <TableCell className="text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white whitespace-nowrap">
                                        {displayName}
                                    </TableCell>
                                    <TableCell className="text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white whitespace-nowrap">
                                        {formatTime(record.start_time)}
                                    </TableCell>
                                    <TableCell className="text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white whitespace-nowrap">
                                        {formatTime(record.end_time)}
                                    </TableCell>
                                    <TableCell className="text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white whitespace-nowrap">
                                        {(record as any).pickup_destination || "-"}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell px-2 sm:px-4 text-center">
                                        {getStatusBadge(record.status)}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white whitespace-nowrap">
                                        {formatTime(record.clock_in ?? null)}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-xs md:text-sm px-2 sm:px-4 text-center text-gray-900 dark:text-white whitespace-nowrap">
                                        {formatTime(record.clock_out ?? null)}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        {filteredRecords.length === 0 && attendanceRecords.length > 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                    検索条件に一致する出勤記録がありません
                                </TableCell>
                            </TableRow>
                        )}
                        {attendanceRecords.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                    出勤記録がありません
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <AttendanceModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                profiles={profiles}
                currentProfileId=""
                defaultRole={roleFilter}
                initialData={modalInitialData}
                editingRecord={editingRecord}
                onOpenProfileEdit={handleOpenProfileEdit}
                onFocusAttendanceForProfile={handleFocusAttendanceForProfile}
            />

            <UserEditModal
                profile={profileForEdit as any}
                open={isProfileModalOpen}
                onOpenChange={(open) => {
                    setIsProfileModalOpen(open);
                    if (!open) {
                        setProfileForEdit(null);
                    }
                }}
            />
        </>
    );
}
