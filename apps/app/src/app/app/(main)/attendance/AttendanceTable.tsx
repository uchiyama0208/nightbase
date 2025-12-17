"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
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
import { createAttendance } from "./actions";
import { updateAttendance } from "./actions";
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
import { Plus, Settings, Filter, X } from "lucide-react";

import { AttendanceModal } from "./attendance-modal";
import { UserEditModal } from "../users/user-edit-modal";
import { Input } from "@/components/ui/input";

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
}

export function AttendanceTable({ attendanceRecords: initialRecords, profiles, roleFilter: initialRoleFilter, canEdit = false, pagePermissions }: AttendanceTableProps) {
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
    const [dateQuery, setDateQuery] = useState("");
    const [workingOnly, setWorkingOnly] = useState(false);
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

    // Vercel-style tabs with animated underline
    const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    const tabs = [
        { key: "cast", label: "キャスト" },
        { key: "staff", label: "スタッフ" },
    ];

    useEffect(() => {
        const activeButton = tabsRef.current[roleFilter];
        if (activeButton) {
            setIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
            });
        }
    }, [roleFilter]);

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileForEdit, setProfileForEdit] = useState<Profile | null>(null);

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
    }), [attendanceRecords, profileMap, roleFilter, nameQuery, dateQuery, workingOnly]);

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

    const activeFilters = useMemo(() => [
        nameQuery.trim() && "名前",
        dateQuery && "日付",
        workingOnly && "出勤中のみ",
    ].filter(Boolean) as string[], [nameQuery, dateQuery, workingOnly]);
    const hasFilters = activeFilters.length > 0;

    return (
        <>
            <div className="flex items-center gap-2 mb-4">
                <button
                    type="button"
                    className={`flex items-center gap-1 px-1 py-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
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
                                className="h-10 w-10 rounded-full bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-800 shadow-sm transition-all hover:scale-105 active:scale-95"
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
            <div className="relative mb-4">
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            ref={(el) => { tabsRef.current[tab.key] = el; }}
                            type="button"
                            onClick={() => {
                                setRoleFilter(tab.key);
                                router.push(`/app/attendance?role=${tab.key}`, { scroll: false });
                            }}
                            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                                roleFilter === tab.key
                                    ? "text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <span
                    className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-300 ease-out"
                    style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                />
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                            <TableHead className="w-1/5 text-center text-gray-900 dark:text-gray-100">日付</TableHead>
                            <TableHead className="w-1/5 text-center text-gray-900 dark:text-gray-100">名前</TableHead>
                            <TableHead className="w-1/5 text-center text-gray-900 dark:text-gray-100">開始</TableHead>
                            <TableHead className="w-1/5 text-center text-gray-900 dark:text-gray-100">終了</TableHead>
                            <TableHead className="w-1/5 text-center text-gray-900 dark:text-gray-100">状態</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRecords.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
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
                                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                        onClick={() => {
                                            if (record.isVirtual) {
                                                handleModalOpen({
                                                    initialData: {
                                                        profileId: record.profile_id,
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
                                        <TableCell className="w-1/5 text-center text-gray-900 dark:text-gray-100">
                                            {formatDate(record.date)}
                                        </TableCell>
                                        <TableCell className="w-1/5 text-center text-gray-900 dark:text-gray-100">
                                            <span className="inline-flex items-center gap-1 justify-center">
                                                {displayName}
                                                {profile?.status === "体入" && (
                                                    <span className="text-[9px] px-1 py-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                                        体入
                                                    </span>
                                                )}
                                            </span>
                                        </TableCell>
                                        <TableCell className="w-1/5 text-center text-gray-900 dark:text-gray-100">
                                            {formatTime(record.start_time)}
                                        </TableCell>
                                        <TableCell className="w-1/5 text-center text-gray-900 dark:text-gray-100">
                                            {formatTime(record.end_time)}
                                        </TableCell>
                                        <TableCell className="w-1/5 text-center">
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
                hidePersonalInfo={!pagePermissions?.personalInfo}
                pagePermissions={pagePermissions}
            />

            {/* Filter Modal */}
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <DialogContent className="max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
                            フィルター
                        </DialogTitle>
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
                                    className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 pr-9 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {nameQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setNameQuery("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                日付で絞り込み
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dateQuery}
                                    onChange={(e) => setDateQuery(e.target.value)}
                                    onClick={(event) => event.currentTarget.showPicker?.()}
                                    className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 pr-9 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {dateQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setDateQuery("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={workingOnly}
                                onChange={(e) => setWorkingOnly(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                                style={{ accentColor: '#2563eb' }}
                            />
                            <span>出勤中のみ表示</span>
                        </label>
                        <Button
                            className="w-full rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            onClick={() => setIsFilterOpen(false)}
                        >
                            適用
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
