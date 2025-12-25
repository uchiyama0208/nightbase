"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { createBrowserClient } from "@supabase/ssr";

interface AttendanceRecord {
    id: string;
    profile_id: string;
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
    break_count?: number;
}

interface Profile {
    id: string;
    display_name: string | null;
    display_name_kana?: string | null;
    real_name: string | null;
    role: string;
    status?: string | null;
}

import Link from "next/link";
import { Plus, Settings, Filter, X, ChevronLeft } from "lucide-react";

import { AttendanceModal } from "./attendance-modal";
import { UserEditModal } from "../users/user-edit-modal";
import { Input } from "@/components/ui/input";
import { VercelTabs } from "@/components/ui/vercel-tabs";

interface PagePermissions {
    bottles: boolean;
    resumes: boolean;
    salarySystems: boolean;
    attendance: boolean;
    personalInfo: boolean;
}

interface AttendanceTableProps {
    attendanceRecords: AttendanceRecord[];
    profiles: Profile[];
    roleFilter: string;
    canEdit?: boolean;
    pagePermissions?: PagePermissions;
    pickupEnabledCast?: boolean;
    pickupEnabledStaff?: boolean;
    showBreakColumns?: boolean;
}

export function AttendanceTable({ attendanceRecords: initialRecords, profiles, roleFilter: initialRoleFilter, canEdit = false, pagePermissions, pickupEnabledCast = false, pickupEnabledStaff = false, showBreakColumns = false }: AttendanceTableProps) {
    const router = useRouter();
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(initialRecords);
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
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [roleFilter, setRoleFilter] = useState(initialRoleFilter);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Update records when initialRecords changes
    useEffect(() => {
        setAttendanceRecords(initialRecords);
    }, [initialRecords]);

    // Supabase Realtime subscription
    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const channel = supabase
            .channel("work_records_changes")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "work_records",
                },
                () => {
                    router.refresh();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [router]);

    const tabs = [
        { key: "cast", label: "キャスト" },
        { key: "staff", label: "スタッフ" },
    ];

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileForEdit, setProfileForEdit] = useState<Profile | null>(null);
    const [isCreateProfileMode, setIsCreateProfileMode] = useState(false);

    const profileMap = useMemo(() => {
        const map: Record<string, Profile> = {};
        for (const p of profiles) {
            map[p.id] = p;
        }
        return map;
    }, [profiles]);

    const tableProfiles = useMemo(() => profiles.filter((p) => {
        if (roleFilter === "cast") return p.role === "cast";
        return p.role === "staff" || p.role === "admin";
    }), [profiles, roleFilter]);

    const nameSuggestions = useMemo(
        () =>
            Array.from(
                new Set(
                    tableProfiles
                        .map((profile) => profile.display_name_kana || profile.display_name || profile.real_name || "")
                        .filter(Boolean),
                ),
            ),
        [tableProfiles],
    );

    const handleOpenProfileEdit = (profileId: string) => {
        const profile = profileMap[profileId];
        if (!profile) return;
        setProfileForEdit(profile);
        setIsCreateProfileMode(false);
        setIsProfileModalOpen(true);
    };

    const handleCreateNewProfile = () => {
        setProfileForEdit(null);
        setIsCreateProfileMode(true);
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

    const filteredRecords = useMemo(() => attendanceRecords.filter((record) => {
        if (!record.profile_id) return false;
        const profile = profileMap[record.profile_id];
        if (!profile) return false;

        // Hide scheduled records from the table
        if (record.status === "scheduled") return false;

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

        if (dateFrom && record.date < dateFrom) return false;
        if (dateTo && record.date > dateTo) return false;
        return true;
    }), [attendanceRecords, profileMap, roleFilter, nameQuery, dateFrom, dateTo]);

    const formatTime = useCallback((timeString: string | null) => {
        if (!timeString) return "-";
        const match = /^\d{2}:\d{2}(?::\d{2})?$/.test(timeString);
        if (match) return timeString.slice(0, 5);
        const date = new Date(timeString);
        if (isNaN(date.getTime())) return "-";
        return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });
    }, []);

    const formatDate = useCallback((dateString: string) => {
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
    }, []);

    const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
        scheduled: { label: "予定", color: "bg-blue-100 text-blue-800" },
        working: { label: "出勤中", color: "bg-green-100 text-green-800" },
        finished: { label: "完了", color: "bg-gray-100 text-gray-800" },
        absent: { label: "欠勤", color: "bg-red-100 text-red-800" },
        forgot_clockout: { label: "退勤忘れ", color: "bg-yellow-100 text-yellow-800" },
    };

    const getStatusBadge = useCallback((status: string) => {
        const config = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-800" };
        return (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color} whitespace-nowrap`}>
                {config.label}
            </span>
        );
    }, []);

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

    // 楽観的削除: UIから即座に削除
    const handleOptimisticDelete = useCallback((recordId: string) => {
        setAttendanceRecords(prev => prev.filter(r => r.id !== recordId));
    }, []);

    // 削除失敗時に元に戻す
    const handleRevertDelete = useCallback((record: AttendanceRecord) => {
        setAttendanceRecords(prev => {
            // 日付順で適切な位置に挿入
            const newRecords = [...prev, record];
            return newRecords.sort((a, b) => {
                if (a.date !== b.date) return b.date.localeCompare(a.date);
                const aTime = a.clock_in_time || "";
                const bTime = b.clock_in_time || "";
                return bTime.localeCompare(aTime);
            });
        });
    }, []);

    const activeFilters = useMemo(() => [
        nameQuery.trim() && "名前",
        dateFrom && "開始日",
        dateTo && "終了日",
    ].filter(Boolean) as string[], [nameQuery, dateFrom, dateTo]);
    const hasFilters = activeFilters.length > 0;

    return (
        <>
            <div className="flex items-center gap-2 mb-4">
                <button
                    type="button"
                    className={`flex items-center gap-1 px-1 py-1 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        hasFilters ? "text-blue-600" : "text-gray-500 dark:text-gray-400"
                    }`}
                    onClick={() => setIsFilterOpen(true)}
                >
                    <Filter className="h-5 w-5 shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        フィルター: {hasFilters ? activeFilters.join("・") : "なし"}
                    </span>
                </button>
                <div className="flex-1" />
                {canEdit && (
                    <>
                        <Link href="/app/settings/timecard">
                            <Button
                                size="icon"
                                variant="outline"
                                className="h-10 w-10 rounded-full bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700 shadow-sm transition-all hover:scale-105 active:scale-95"
                            >
                                <Settings className="h-5 w-5" />
                            </Button>
                        </Link>
                        <Button
                            size="icon"
                            className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                            onClick={() => handleModalOpen()}
                        >
                            <Plus className="h-5 w-5" />
                        </Button>
                    </>
                )}
            </div>

            {/* Vercel-style Tab Navigation */}
            <VercelTabs
                tabs={tabs}
                value={roleFilter}
                onChange={(val) => {
                    setRoleFilter(val);
                    router.push(`/app/attendance?role=${val}`, { scroll: false });
                }}
                className="mb-4"
            />
            <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <Table className="table-fixed">
                    <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                            <TableHead className="text-center text-gray-900 dark:text-gray-100">日付</TableHead>
                            <TableHead className="text-center text-gray-900 dark:text-gray-100">名前</TableHead>
                            <TableHead className="text-center text-gray-900 dark:text-gray-100">開始</TableHead>
                            <TableHead className="text-center text-gray-900 dark:text-gray-100">終了</TableHead>
                            {showBreakColumns && (
                                <TableHead className="hidden md:table-cell text-center text-gray-900 dark:text-gray-100">休憩</TableHead>
                            )}
                            <TableHead className="text-center text-gray-900 dark:text-gray-100">状態</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRecords.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={showBreakColumns ? 6 : 5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    {attendanceRecords.length === 0 ? "出勤記録がありません" : "検索条件に一致する出勤記録がありません"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRecords.map((record) => {
                                if (!record.profile_id) return null;
                                const profile = profileMap[record.profile_id];
                                const displayName = profile ? (profile.display_name || profile.real_name || "不明") : "不明";

                                return (
                                    <TableRow
                                        key={record.id}
                                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                        onClick={() => {
                                            // シフト予定（shift_で始まるID）または仮想レコードは新規作成モードで開く
                                            if (record.isVirtual || record.id.startsWith("shift_")) {
                                                handleModalOpen({
                                                    initialData: {
                                                        profileId: record.profile_id,
                                                        date: record.date,
                                                        status: record.status,
                                                        startTime: record.start_time || "",
                                                        endTime: record.end_time || "",
                                                    }
                                                });
                                            } else {
                                                handleModalOpen({ record: record });
                                            }
                                        }}
                                    >
                                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                            {formatDate(record.date)}
                                        </TableCell>
                                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                            <span className="inline-flex items-center gap-1 justify-center">
                                                {displayName}
                                                {profile?.status === "体入" && (
                                                    <span className="text-[10px] px-1 py-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                                        体入
                                                    </span>
                                                )}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                            {formatTime(record.start_time)}
                                        </TableCell>
                                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                            {formatTime(record.end_time)}
                                        </TableCell>
                                        {showBreakColumns && (
                                            <TableCell className="hidden md:table-cell text-center text-gray-900 dark:text-gray-100">
                                                {record.break_count !== undefined && record.break_count > 0
                                                    ? `${record.break_count}回`
                                                    : "-"}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-center">
                                            {getStatusBadge(record.status)}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <AttendanceModal
                key={editingRecord?.id || "new"}
                isOpen={isModalOpen}
                onClose={handleModalClose}
                profiles={profiles}
                currentProfileId=""
                defaultRole={roleFilter}
                initialData={modalInitialData}
                editingRecord={editingRecord}
                onOpenProfileEdit={handleOpenProfileEdit}
                onFocusAttendanceForProfile={handleFocusAttendanceForProfile}
                onOptimisticDelete={handleOptimisticDelete}
                onRevertDelete={handleRevertDelete}
                onCreateNewProfile={handleCreateNewProfile}
                pickupEnabledCast={pickupEnabledCast}
                pickupEnabledStaff={pickupEnabledStaff}
                showBreakColumns={showBreakColumns}
            />

            <UserEditModal
                profile={isCreateProfileMode ? null : (profileForEdit as any)}
                open={isProfileModalOpen}
                onOpenChange={(open) => {
                    setIsProfileModalOpen(open);
                    if (!open) {
                        setProfileForEdit(null);
                        setIsCreateProfileMode(false);
                    }
                }}
                defaultRole={roleFilter === "staff" ? "staff" : "cast"}
                hidePersonalInfo={!pagePermissions?.personalInfo}
                pagePermissions={pagePermissions}
            />

            {/* Filter Modal */}
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 bg-white dark:bg-gray-900">
                        <button
                            type="button"
                            onClick={() => setIsFilterOpen(false)}
                            className="p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-gray-900 dark:text-white">
                            フィルター
                        </DialogTitle>
                        <div className="w-7" />
                    </DialogHeader>
                    <div className="flex flex-col gap-4 mt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                名前で検索
                            </label>
                            <div className="relative">
                                <Input
                                    placeholder="名前を入力..."
                                    value={nameQuery}
                                    onChange={(e) => setNameQuery(e.target.value)}
                                    className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 pr-9 text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {nameQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setNameQuery("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                開始日
                            </label>
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                onClick={(event) => event.currentTarget.showPicker?.()}
                                className="h-10 text-base"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                終了日
                            </label>
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                onClick={(event) => event.currentTarget.showPicker?.()}
                                className="h-10 text-base"
                            />
                        </div>
                        <Button
                            className="w-full rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            onClick={() => setIsFilterOpen(false)}
                        >
                            適用
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsFilterOpen(false)}
                            className="w-full"
                        >
                            戻る
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
