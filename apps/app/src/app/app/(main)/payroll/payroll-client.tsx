"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Plus, ChevronRight, Pencil, ChevronLeft, Printer } from "lucide-react";
import nextDynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { SlipDetailModal } from "@/components/slips/slip-detail-modal";
import { AttendanceModal } from "@/app/app/(main)/attendance/attendance-modal";
import { SalarySystem, getSalarySystems, assignSalarySystemToProfile, removeSalarySystemFromProfile } from "@/app/app/(main)/salary-systems/actions";

// Lazy load modals
const SalarySystemModal = nextDynamic(
    () => import("@/app/app/(main)/salary-systems/salary-system-modal").then(mod => ({ default: mod.SalarySystemModal })),
    { loading: () => null, ssr: false }
);
const SalarySystemSelectorModal = nextDynamic(
    () => import("@/app/app/(main)/users/salary-system-selector-modal").then(mod => ({ default: mod.SalarySystemSelectorModal })),
    { loading: () => null, ssr: false }
);

interface PayrollRecord {
    date: string;
    label: string;
    profileId: string;
    name: string;
    hourlyWage: number;
    hourlyDetails: {
        timeCardId: string;
        hourlyRate: number;
        clockIn: string | null;
        clockOut: string | null;
        hoursWorked: number;
    } | null;
    backAmount: number;
    backDetails: {
        sessionId: string;
        tableName: string;
        guestName: string | null;
        menuName: string;
        quantity: number;
        unitBack: number;
        amount: number;
    }[];
    deductionAmount: number;
    deductionDetails: { name: string; amount: number; type: string }[];
    totalSalary: number;
    salarySystemId: string | null;
    salarySystemName: string | null;
}

interface PayrollData {
    records: PayrollRecord[];
    todayTotal: number;
}

type RoleFilter = "cast" | "staff" | "partner";

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0,
    }).format(amount);
}

interface PayrollClientProps {
    canEdit?: boolean;
}

export function PayrollClient({ canEdit = false }: PayrollClientProps) {
    const [data, setData] = useState<PayrollData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("cast");
    const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

    // Attendance modal state
    const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
    const [attendanceRecord, setAttendanceRecord] = useState<any>(null);
    const [attendanceProfiles, setAttendanceProfiles] = useState<any[]>([]);
    const [currentProfileId, setCurrentProfileId] = useState<string>("");

    // Salary system modal state
    const [salarySystems, setSalarySystems] = useState<SalarySystem[]>([]);
    const [salarySystemModalOpen, setSalarySystemModalOpen] = useState(false);
    const [viewingSalarySystem, setViewingSalarySystem] = useState<SalarySystem | null>(null);
    const [selectorModalOpen, setSelectorModalOpen] = useState(false);
    const [selectedSalarySystemId, setSelectedSalarySystemId] = useState<string | null>(null);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [originalSalarySystemId, setOriginalSalarySystemId] = useState<string | null>(null);

    // Vercel-style tabs with animated underline
    const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    const roleLabels: Record<RoleFilter, string> = {
        cast: "キャスト",
        staff: "スタッフ",
        partner: "パートナー",
    };

    useEffect(() => {
        const activeButton = tabsRef.current[roleFilter];
        if (activeButton) {
            setIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
            });
        }
    }, [roleFilter]);

    useEffect(() => {
        loadPayrollData();
    }, [roleFilter]);

    // Load salary systems once on mount
    useEffect(() => {
        loadSalarySystems();
    }, []);

    const loadSalarySystems = async () => {
        const systems = await getSalarySystems();
        setSalarySystems(systems);
    };

    // Open salary system detail modal
    const openSalarySystemDetail = (salarySystemId: string) => {
        const system = salarySystems.find(s => s.id === salarySystemId);
        if (system) {
            setViewingSalarySystem(system);
            setSalarySystemModalOpen(true);
        }
    };

    // Open salary system selector modal
    const openSalarySystemSelector = (profileId: string, currentSalarySystemId: string | null) => {
        setEditingProfileId(profileId);
        setOriginalSalarySystemId(currentSalarySystemId);
        setSelectedSalarySystemId(currentSalarySystemId);
        setSelectorModalOpen(true);
    };

    // Handle salary system selection save
    const handleSalarySystemSave = async () => {
        if (!editingProfileId) return;

        try {
            // Remove old assignment if exists and different from new
            if (originalSalarySystemId && originalSalarySystemId !== selectedSalarySystemId) {
                await removeSalarySystemFromProfile(editingProfileId, originalSalarySystemId);
            }

            // Add new assignment if selected
            if (selectedSalarySystemId && selectedSalarySystemId !== originalSalarySystemId) {
                await assignSalarySystemToProfile(editingProfileId, selectedSalarySystemId);
            }

            // Reload data and update selectedRecord
            const res = await fetch(`/api/payroll?role=${roleFilter}`);
            const result = await res.json();
            setData(result);

            // Update selectedRecord with new salary system info
            if (selectedRecord) {
                const updated = result.records?.find(
                    (r: PayrollRecord) => r.date === selectedRecord.date && r.profileId === selectedRecord.profileId
                );
                if (updated) {
                    setSelectedRecord(updated);
                }
            }

            await loadSalarySystems();
        } catch (error) {
            console.error("Failed to update salary system:", error);
        }
    };

    // Handle salary system detail from selector modal
    const handleOpenSalarySystemFromSelector = (system: { id: string; name: string; target_type: string }) => {
        const fullSystem = salarySystems.find(s => s.id === system.id);
        if (fullSystem) {
            setViewingSalarySystem(fullSystem);
            setSalarySystemModalOpen(true);
        }
    };

    const loadPayrollData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/payroll?role=${roleFilter}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "給与データの取得に失敗しました");
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

    const openAttendanceModal = async (timeCardId: string) => {
        try {
            const res = await fetch(`/api/timecard/${timeCardId}`);
            if (!res.ok) {
                throw new Error("勤怠データの取得に失敗しました");
            }
            const data = await res.json();
            setAttendanceRecord(data.record);
            setAttendanceProfiles(data.profiles);
            setCurrentProfileId(data.currentProfileId);
            setAttendanceModalOpen(true);
        } catch (err) {
            console.error("Failed to load attendance data:", err);
        }
    };

    const roles: RoleFilter[] = ["cast", "staff", "partner"];

    if (error) {
        return (
            <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <Button onClick={loadPayrollData} className="mt-4 rounded-lg" variant="outline">
                    再試行
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-2">

            {/* Plus Button */}
            {canEdit && (
                <div className="flex items-center justify-end">
                    <Button
                        size="icon"
                        className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
            )}

            {/* Vercel-style Tab Navigation */}
            <div className="relative">
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    {roles.map((role) => (
                        <button
                            key={role}
                            ref={(el) => { tabsRef.current[role] = el; }}
                            type="button"
                            onClick={() => setRoleFilter(role)}
                            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                                roleFilter === role
                                    ? "text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            }`}
                        >
                            {roleLabels[role]}
                        </button>
                    ))}
                </div>
                <span
                    className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-300 ease-out"
                    style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                />
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">読み込み中...</p>
                    </div>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                                <TableHead className="w-1/3 text-center text-gray-900 dark:text-gray-100">日付</TableHead>
                                <TableHead className="w-1/3 text-center text-gray-900 dark:text-gray-100">名前</TableHead>
                                <TableHead className="w-1/3 text-center text-gray-900 dark:text-gray-100">給与</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data?.records.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        データがありません
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.records.map((record, index) => (
                                    <TableRow
                                        key={`${record.date}_${record.profileId}_${index}`}
                                        onClick={() => setSelectedRecord(record)}
                                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                    >
                                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                            {record.label}
                                        </TableCell>
                                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                            {record.name}
                                        </TableCell>
                                        <TableCell className={`text-center font-medium ${
                                            record.totalSalary >= 0
                                                ? "text-gray-900 dark:text-gray-100"
                                                : "text-red-600 dark:text-red-400"
                                        }`}>
                                            {formatCurrency(record.totalSalary)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* 印刷用給与明細（画面には非表示、印刷時のみ表示） */}
            {selectedRecord && (
                <div className="print-payslip">
                    <div className="max-w-3xl mx-auto text-black">
                        {/* ヘッダー */}
                        <div className="text-center mb-6 border-b-2 border-black pb-4">
                            <h1 className="text-2xl font-bold mb-2">給 与 明 細 書</h1>
                            <p className="text-base">{selectedRecord.label}</p>
                        </div>

                        {/* 基本情報 */}
                        <div className="mb-5">
                            <table className="w-full">
                                <tbody>
                                    <tr>
                                        <td className="bg-gray-100 font-medium w-20 text-center">氏名</td>
                                        <td className="w-48">{selectedRecord.name}</td>
                                        <td className="bg-gray-100 font-medium w-28 text-center">給与システム</td>
                                        <td>{selectedRecord.salarySystemName || "-"}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* 4セクション横並びレイアウト */}
                        <div className="grid grid-cols-2 gap-4 mb-5">
                            {/* 1. 勤怠 */}
                            <div>
                                <div className="bg-gray-200 font-bold px-3 py-1.5 text-center">勤 怠</div>
                                <table className="w-full">
                                    <tbody>
                                        <tr>
                                            <td className="bg-gray-100 font-medium w-28">出勤日数</td>
                                            <td className="text-right">1 日</td>
                                        </tr>
                                        <tr>
                                            <td className="bg-gray-100 font-medium">労働時間</td>
                                            <td className="text-right">{selectedRecord.hourlyDetails?.hoursWorked.toFixed(2) || "0.00"} 時間</td>
                                        </tr>
                                        <tr>
                                            <td className="bg-gray-100 font-medium">出勤時刻</td>
                                            <td className="text-right">{selectedRecord.hourlyDetails?.clockIn || "-"}</td>
                                        </tr>
                                        <tr>
                                            <td className="bg-gray-100 font-medium">退勤時刻</td>
                                            <td className="text-right">{selectedRecord.hourlyDetails?.clockOut || "勤務中"}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* 2. 支給 */}
                            <div>
                                <div className="bg-gray-200 font-bold px-3 py-1.5 text-center">支 給</div>
                                <table className="w-full">
                                    <tbody>
                                        <tr>
                                            <td className="bg-gray-100 font-medium w-28">基本給（時給）</td>
                                            <td className="text-right">{formatCurrency(selectedRecord.hourlyWage)}</td>
                                        </tr>
                                        {selectedRecord.hourlyDetails && (
                                            <tr>
                                                <td className="bg-gray-50 text-xs pl-4">└ {formatCurrency(selectedRecord.hourlyDetails.hourlyRate)}/h × {selectedRecord.hourlyDetails.hoursWorked.toFixed(2)}h</td>
                                                <td></td>
                                            </tr>
                                        )}
                                        <tr>
                                            <td className="bg-gray-100 font-medium">バック手当</td>
                                            <td className="text-right">{formatCurrency(selectedRecord.backAmount)}</td>
                                        </tr>
                                        {selectedRecord.backDetails && selectedRecord.backDetails.length > 0 && (
                                            selectedRecord.backDetails.map((back, i) => (
                                                <tr key={i}>
                                                    <td className="bg-gray-50 text-xs pl-4">└ {back.tableName}{back.guestName ? ` / ${back.guestName}` : ""}: {back.menuName} ×{back.quantity}</td>
                                                    <td className="text-right text-xs">{formatCurrency(back.amount)}</td>
                                                </tr>
                                            ))
                                        )}
                                        <tr className="bg-gray-100">
                                            <td className="font-bold">総支給額</td>
                                            <td className="text-right font-bold">{formatCurrency(selectedRecord.hourlyWage + selectedRecord.backAmount)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* 3. 控除 */}
                            <div>
                                <div className="bg-gray-200 font-bold px-3 py-1.5 text-center">控 除</div>
                                <table className="w-full">
                                    <tbody>
                                        {selectedRecord.deductionDetails && selectedRecord.deductionDetails.length > 0 ? (
                                            selectedRecord.deductionDetails.map((ded, i) => (
                                                <tr key={i}>
                                                    <td className="bg-gray-100 font-medium w-28">{ded.name}</td>
                                                    <td className="text-right">{formatCurrency(ded.amount)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td className="bg-gray-100 font-medium w-28">控除項目</td>
                                                <td className="text-right text-gray-500">なし</td>
                                            </tr>
                                        )}
                                        <tr className="bg-gray-100">
                                            <td className="font-bold">控除合計</td>
                                            <td className="text-right font-bold">{formatCurrency(selectedRecord.deductionAmount)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* 4. 差引支給額（手取り額） */}
                            <div>
                                <div className="bg-gray-200 font-bold px-3 py-1.5 text-center">差引支給額</div>
                                <table className="w-full h-full">
                                    <tbody>
                                        <tr>
                                            <td className="bg-gray-100 font-medium w-28">総支給額</td>
                                            <td className="text-right">{formatCurrency(selectedRecord.hourlyWage + selectedRecord.backAmount)}</td>
                                        </tr>
                                        <tr>
                                            <td className="bg-gray-100 font-medium">控除合計</td>
                                            <td className="text-right">- {formatCurrency(selectedRecord.deductionAmount)}</td>
                                        </tr>
                                        <tr className="bg-gray-200">
                                            <td className="font-bold text-lg">手取り額</td>
                                            <td className="text-right font-bold text-lg">{formatCurrency(selectedRecord.totalSalary)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* フッター */}
                        <div className="mt-6 pt-4 border-t border-gray-400">
                            <p className="text-xs text-gray-600 text-center">上記の通り支給致します。</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
                <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-0 dark:border-gray-800 dark:bg-gray-900 no-print">
                    <DialogHeader className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex flex-row items-center justify-between space-y-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedRecord(null)}
                            className="h-8 w-8 text-gray-600 dark:text-gray-400"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white flex-1 text-center">
                            {selectedRecord?.name} - {selectedRecord?.label}
                        </DialogTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.print()}
                            className="h-8 w-8 text-gray-600 dark:text-gray-400"
                        >
                            <Printer className="h-5 w-5" />
                        </Button>
                    </DialogHeader>

                    <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                        {/* Salary System Section */}
                        <div className="pb-2 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500 dark:text-gray-400">給与システム</span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (selectedRecord) {
                                            openSalarySystemSelector(selectedRecord.profileId, selectedRecord.salarySystemId);
                                        }
                                    }}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            {selectedRecord?.salarySystemId ? (
                                <button
                                    type="button"
                                    onClick={() => openSalarySystemDetail(selectedRecord.salarySystemId!)}
                                    className="mt-1 w-full text-left flex items-center justify-between py-1.5 px-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                >
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                        {selectedRecord.salarySystemName}
                                    </span>
                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                </button>
                            ) : (
                                <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">未設定</p>
                            )}
                        </div>

                        {/* 時給 */}
                        <div className="py-2 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">時給</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {formatCurrency(selectedRecord?.hourlyWage || 0)}
                                </span>
                            </div>
                            {selectedRecord?.hourlyDetails && (
                                <button
                                    type="button"
                                    onClick={() => openAttendanceModal(selectedRecord.hourlyDetails!.timeCardId)}
                                    className="mt-2 pl-4 pr-2 py-2 -mx-2 w-full text-left rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                                            <div className="flex gap-4">
                                                <span>時給単価: {formatCurrency(selectedRecord.hourlyDetails.hourlyRate)}/h</span>
                                            </div>
                                            <div className="flex gap-4">
                                                <span>出勤: {selectedRecord.hourlyDetails.clockIn || "-"}</span>
                                                <span>退勤: {selectedRecord.hourlyDetails.clockOut || "勤務中"}</span>
                                            </div>
                                            <div>
                                                <span>勤務時間: {selectedRecord.hourlyDetails.hoursWorked.toFixed(2)}時間</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* バック */}
                        <div className="py-2 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">バック</span>
                                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                    +{formatCurrency(selectedRecord?.backAmount || 0)}
                                </span>
                            </div>
                            {selectedRecord?.backDetails && selectedRecord.backDetails.length > 0 && (
                                <div className="mt-2 space-y-2">
                                    {selectedRecord.backDetails.map((back, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setSelectedSessionId(back.sessionId)}
                                            className="w-full text-left pl-4 pr-2 py-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-gray-600 dark:text-gray-400">
                                                            {back.tableName}{back.guestName ? ` / ${back.guestName}` : ""}
                                                        </span>
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                            +{formatCurrency(back.amount)}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                        {back.menuName} × {back.quantity} ({formatCurrency(back.unitBack)}/個)
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {(!selectedRecord?.backDetails || selectedRecord.backDetails.length === 0) && (
                                <p className="mt-1 pl-4 text-xs text-gray-400 dark:text-gray-500">バックなし</p>
                            )}
                        </div>

                        {/* 引かれもの */}
                        <div className="py-2 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">引かれもの</span>
                                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                    -{formatCurrency(selectedRecord?.deductionAmount || 0)}
                                </span>
                            </div>
                            {selectedRecord?.deductionDetails && selectedRecord.deductionDetails.length > 0 && (
                                <div className="mt-2 pl-4 space-y-1">
                                    {selectedRecord.deductionDetails.map((ded, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                            <span>
                                                {ded.name}
                                                <span className="ml-1.5 text-gray-400 dark:text-gray-500">({ded.type})</span>
                                            </span>
                                            <span className="text-red-500 dark:text-red-400">-{formatCurrency(ded.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {(!selectedRecord?.deductionDetails || selectedRecord.deductionDetails.length === 0) && (
                                <p className="mt-1 pl-4 text-xs text-gray-400 dark:text-gray-500">控除なし</p>
                            )}
                        </div>

                        {/* 合計 */}
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">合計</span>
                            <span className={`text-lg font-bold ${
                                (selectedRecord?.totalSalary || 0) >= 0
                                    ? "text-gray-900 dark:text-white"
                                    : "text-red-600 dark:text-red-400"
                            }`}>
                                {formatCurrency(selectedRecord?.totalSalary || 0)}
                            </span>
                        </div>

                        {/* 戻るボタン */}
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                            <Button
                                variant="outline"
                                className="w-full h-11 rounded-lg"
                                onClick={() => setSelectedRecord(null)}
                            >
                                戻る
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Slip Detail Modal */}
            <SlipDetailModal
                isOpen={!!selectedSessionId}
                onClose={() => setSelectedSessionId(null)}
                sessionId={selectedSessionId}
                editable={true}
            />

            {/* Attendance Modal */}
            <AttendanceModal
                isOpen={attendanceModalOpen}
                onClose={() => {
                    setAttendanceModalOpen(false);
                    setAttendanceRecord(null);
                }}
                profiles={attendanceProfiles}
                currentProfileId={currentProfileId}
                editingRecord={attendanceRecord}
onSaved={async () => {
                    // Reload payroll data when attendance is saved
                    const res = await fetch(`/api/payroll?role=${roleFilter}`);
                    const result = await res.json();
                    setData(result);

                    // Update selected record - date might have changed, so search by profileId only
                    if (selectedRecord) {
                        const matchingRecords = result.records?.filter(
                            (r: PayrollRecord) => r.profileId === selectedRecord.profileId
                        ) || [];

                        if (matchingRecords.length > 0) {
                            // Try to find the same date, otherwise use the most recent
                            const sameDate = matchingRecords.find(
                                (r: PayrollRecord) => r.date === selectedRecord.date
                            );
                            setSelectedRecord(sameDate || matchingRecords[0]);
                        } else {
                            setSelectedRecord(null);
                        }
                    }
                }}
            />

            {/* Salary System Detail Modal (View Only) */}
            <SalarySystemModal
                isOpen={salarySystemModalOpen}
                onClose={() => {
                    setSalarySystemModalOpen(false);
                    setViewingSalarySystem(null);
                }}
                system={viewingSalarySystem}
                targetType={viewingSalarySystem?.target_type || "cast"}
onSaved={async (savedSystem) => {
                    // Update local list
                    setSalarySystems(prev => prev.map(s => s.id === savedSystem.id ? savedSystem : s));

                    // Reload payroll data and update selectedRecord
                    const res = await fetch(`/api/payroll?role=${roleFilter}`);
                    const result = await res.json();
                    setData(result);

                    if (selectedRecord) {
                        const updated = result.records?.find(
                            (r: PayrollRecord) => r.date === selectedRecord.date && r.profileId === selectedRecord.profileId
                        );
                        if (updated) {
                            setSelectedRecord(updated);
                        }
                    }
                }}
                onDeleted={async (id) => {
                    setSalarySystems(prev => prev.filter(s => s.id !== id));

                    // Reload payroll data and update selectedRecord
                    const res = await fetch(`/api/payroll?role=${roleFilter}`);
                    const result = await res.json();
                    setData(result);

                    if (selectedRecord) {
                        const updated = result.records?.find(
                            (r: PayrollRecord) => r.date === selectedRecord.date && r.profileId === selectedRecord.profileId
                        );
                        if (updated) {
                            setSelectedRecord(updated);
                        }
                    }
                }}
                storeShowBreakColumns={false}
                storeTimeRoundingEnabled={false}
                storeTimeRoundingMinutes={30}
            />

            {/* Salary System Selector Modal */}
            <SalarySystemSelectorModal
                isOpen={selectorModalOpen}
                onClose={() => {
                    setSelectorModalOpen(false);
                    setEditingProfileId(null);
                }}
                salarySystems={salarySystems.filter(s =>
                    roleFilter === "staff"
                        ? s.target_type === "staff"
                        : s.target_type === roleFilter
                )}
                selectedId={selectedSalarySystemId}
                onSelect={setSelectedSalarySystemId}
                onSave={handleSalarySystemSave}
                onOpenDetail={handleOpenSalarySystemFromSelector}
            />
        </div>
    );
}

export const dynamic = 'force-dynamic';
