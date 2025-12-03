"use client";

import { useState, useRef, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSession, Table } from "@/types/floor";
import { TableGrid } from "@/components/floor/table-grid";
import { UserPlus, ChevronLeft, MoreHorizontal, Receipt, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { PlacementModal } from "./placement-modal";
import { SeatSelectionModal } from "./seat-selection-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { assignCast, closeSession, deleteSession, removeCastAssignment, updateCastAssignmentStatus, updateCastAssignmentPosition, updateCastAssignmentTimes, getStoreSettings, rotateCast } from "./actions";

const CAST_STATUS_OPTIONS = [
    { value: "waiting", label: "待機", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
    { value: "serving", label: "接客中", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
    { value: "ended", label: "終了", color: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300" },
    { value: "jonai", label: "場内", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
    { value: "shimei", label: "指名", color: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300" },
] as const;

function getStatusOption(status: string) {
    return CAST_STATUS_OPTIONS.find(opt => opt.value === status) || CAST_STATUS_OPTIONS[0];
}

interface SessionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: TableSession;
    table: Table | null;
    onUpdate: () => void;
    onOpenSlip?: (sessionId: string) => void;
    slipIsOpen?: boolean;
}

function ScalableGridWrapper({ grid, assignments, onCellClick }: { grid: any[][], assignments: any[], onCellClick?: (r: number, c: number) => void }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [height, setHeight] = useState<number | undefined>(undefined);

    useEffect(() => {
        const updateScale = () => {
            if (!containerRef.current || !contentRef.current) return;

            const containerWidth = containerRef.current.clientWidth;
            // Use offsetWidth to include borders
            const contentWidth = contentRef.current.offsetWidth;
            const contentHeight = contentRef.current.offsetHeight;

            if (contentWidth === 0) return;

            const newScale = containerWidth / contentWidth;
            setScale(newScale);
            setHeight(contentHeight * newScale);
        };

        // Initial calculation
        updateScale();

        // Observer for resize
        const resizeObserver = new ResizeObserver(updateScale);
        if (containerRef.current) resizeObserver.observe(containerRef.current);
        if (contentRef.current) resizeObserver.observe(contentRef.current);

        return () => resizeObserver.disconnect();
    }, [grid]);

    return (
        <div
            ref={containerRef}
            className="w-full overflow-hidden flex justify-center"
            style={{
                height: height ? `${height}px` : 'auto',
                maxHeight: '60vh',
                minHeight: '300px'
            }}
        >
            <div
                ref={contentRef}
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                    width: 'max-content' // Ensure it takes natural width
                }}
                className="origin-top"
            >
                <TableGrid
                    grid={grid}
                    assignments={assignments}
                    onCellClick={onCellClick}
                />
            </div>
        </div>
    );
}

export function SessionDetailModal({ isOpen, onClose, session, table, onUpdate, onOpenSlip, slipIsOpen = false }: SessionDetailModalProps) {
    const [daySwitchTime, setDaySwitchTime] = useState<string>("05:00:00");

    useEffect(() => {
        getStoreSettings().then(settings => {
            if (settings?.day_switch_time) {
                setDaySwitchTime(settings.day_switch_time);
            }
        });
    }, []);

    // Check for cast rotation every 10 seconds
    useEffect(() => {
        const checkRotation = async () => {
            const assignments = (session as any).cast_assignments || [];
            const now = new Date();

            for (const assignment of assignments) {
                if (assignment.status === 'serving' && assignment.end_time) {
                    const endTime = new Date(assignment.end_time);
                    if (now >= endTime) {
                        await rotateCast(assignment.id);
                        onUpdate();
                    }
                }
            }
        };

        const interval = setInterval(checkRotation, 10000);
        return () => clearInterval(interval);
    }, [session, onUpdate]);
    const [isPlacementOpen, setIsPlacementOpen] = useState(false);
    const [placementMode, setPlacementMode] = useState<"guest" | "cast">("guest");
    const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
    const [showActions, setShowActions] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<"table" | "grid">("table");
    const [pendingPlacement, setPendingPlacement] = useState<{ profile: any; mode: "guest" | "cast"; guestId: string | null; assignmentId?: string } | null>(null);
    const [isSeatSelectionOpen, setIsSeatSelectionOpen] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
    const [statusEdit, setStatusEdit] = useState<{ id: string; name: string; currentStatus: string } | null>(null);
    const [castDetailEdit, setCastDetailEdit] = useState<{
        profile: any;
        guestId: string | null;
        gridX: number | null;
        gridY: number | null;
        startTime: string;
        endTime: string;
        status: string;
    } | null>(null);
    const [closeConfirm, setCloseConfirm] = useState(false);
    const [expandedGuestIds, setExpandedGuestIds] = useState<Set<string>>(new Set());

    // Initialize expanded state when guests change
    useEffect(() => {
        if (session) {
            const guestIds = (session as any).cast_assignments
                ?.filter((a: any) => a.cast_id === a.guest_id)
                .map((a: any) => a.guest_id) || [];
            setExpandedGuestIds(new Set(guestIds));
        }
    }, [session]);

    const castAssignments = (session as any).cast_assignments || [];

    // Debug: Log assignments to check grid_x/grid_y values
    useEffect(() => {
        if (session) {
            console.log("Cast Assignments:", castAssignments);
            console.log("Unassigned items:", castAssignments.filter((a: any) => a.grid_x === null || a.grid_y === null || a.grid_x === undefined || a.grid_y === undefined));
        }
    }, [session, castAssignments]);

    // Group cast assignments by guest
    // cast_id === guest_id の場合はゲスト自身のエントリなのでキャスト一覧には含めない
    const guestGroups = castAssignments.reduce((acc: any, assignment: any) => {
        const guestId = assignment.guest_id || 'unassigned';
        if (!acc[guestId]) {
            acc[guestId] = {
                profile: assignment.guest_profile,
                casts: []
            };
        }
        // ゲスト自身のエントリ（cast_id === guest_id）はキャスト一覧に含めない
        if (assignment.cast_id !== assignment.guest_id) {
            acc[guestId].casts.push(assignment);
        }
        return acc;
    }, {});

    // Get unique guests from assignments
    const guests = Object.keys(guestGroups)
        .filter(id => id !== 'unassigned')
        .map(guestId => ({
            id: guestId,
            ...guestGroups[guestId].profile
        }))
        .filter(guest => guest.id && guest.display_name);

    console.log('Cast Assignments:', castAssignments);
    console.log('Guest Groups:', guestGroups);
    console.log('Guests:', guests);

    const handleDeleteSession = async () => {
        await deleteSession(session.id);
        onUpdate();
        onClose();
        setCloseConfirm(false);
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Tokyo",
        });
    };

    const handleAddGuest = () => {
        setPlacementMode("guest");
        setSelectedGuestId(null);
        setIsPlacementOpen(true);
    };

    const handleAddCastToGuest = (guestId: string) => {
        setPlacementMode("cast");
        setSelectedGuestId(guestId);
        setIsPlacementOpen(true);
    };

    const handleProfileSelect = async (profile: any) => {
        // キャストの場合、2人目以降は席選択をスキップして1人目と同じ位置に配置
        if (placementMode === "cast" && selectedGuestId) {
            // このゲストに既に割り当てられているキャストを探す
            const existingCasts = castAssignments.filter(
                (a: any) => a.guest_id === selectedGuestId && a.cast_id !== selectedGuestId
            );

            if (existingCasts.length > 0) {
                // 1人目のキャストの位置を取得
                const firstCast = existingCasts[0];
                const gridX = firstCast.grid_x;
                const gridY = firstCast.grid_y;

                // 席選択をスキップして直接配置
                try {
                    await assignCast(
                        session.id,
                        profile.id,
                        "waiting",
                        selectedGuestId,
                        gridX,
                        gridY
                        // startTime and endTime will be auto-calculated based on rotation_time
                    );
                    setIsPlacementOpen(false);
                    await onUpdate();
                    return;
                } catch (error) {
                    console.error("Failed to assign cast:", error);
                    alert("配置に失敗しました");
                    return;
                }
            }
        }

        // テーブルがない場合は席選択をスキップして直接配置
        if (!table?.layout_data?.grid) {
            setIsPlacementOpen(false);
            if (placementMode === "guest") {
                try {
                    await assignCast(session.id, profile.id, "waiting", profile.id, null, null);
                    await onUpdate();
                } catch (error) {
                    console.error("Failed to assign:", error);
                    alert("配置に失敗しました");
                }
            } else {
                try {
                    await assignCast(
                        session.id,
                        profile.id,
                        "waiting",
                        selectedGuestId,
                        null,
                        null
                    );
                    await onUpdate();
                } catch (error) {
                    console.error("Failed to assign:", error);
                    alert("配置に失敗しました");
                }
            }
            return;
        }

        // 1人目のキャストまたはゲストの場合は席選択モーダルを開く
        setPendingPlacement({
            profile,
            mode: placementMode,
            guestId: selectedGuestId
        });
        setIsPlacementOpen(false);
        setIsSeatSelectionOpen(true);
    };

    const handleSeatSelect = async (rowIndex: number, colIndex: number) => {
        if (!pendingPlacement) return;

        // 既存のassignmentを更新する場合
        if (pendingPlacement.assignmentId) {
            try {
                await updateCastAssignmentPosition(pendingPlacement.assignmentId, colIndex, rowIndex);
                setPendingPlacement(null);
                setIsSeatSelectionOpen(false);
                await onUpdate();
            } catch (error) {
                console.error("Failed to update assignment position:", error);
                alert("配置の更新に失敗しました");
            }
            return;
        }

        // 新しいassignmentを作成する場合
        if (pendingPlacement.mode === "guest") {
            // ゲストの場合はそのまま配置
            try {
                await assignCast(session.id, pendingPlacement.profile.id, "waiting", pendingPlacement.profile.id, colIndex, rowIndex);
                setPendingPlacement(null);
                setIsSeatSelectionOpen(false);
                await onUpdate();
            } catch (error) {
                console.error("Failed to assign:", error);
                alert("配置に失敗しました");
            }
        } else {
            // キャストの場合は自動計算で直接配置
            try {
                await assignCast(
                    session.id,
                    pendingPlacement.profile.id,
                    "waiting", // デフォルトステータス: 待機
                    pendingPlacement.guestId,
                    colIndex,
                    rowIndex
                    // startTime and endTime will be auto-calculated based on rotation_time
                );
                setPendingPlacement(null);
                setIsSeatSelectionOpen(false);
                await onUpdate();
            } catch (error) {
                console.error("Failed to assign cast:", error);
                alert("配置に失敗しました");
            }
        }
    };

    const handleSkipPlacement = async () => {
        if (!pendingPlacement) return;

        // 既存のassignmentを更新する場合（未配置のままにする）
        if (pendingPlacement.assignmentId) {
            try {
                await updateCastAssignmentPosition(pendingPlacement.assignmentId, null, null);
                setPendingPlacement(null);
                setIsSeatSelectionOpen(false);
                await onUpdate();
            } catch (error) {
                console.error("Failed to update assignment position:", error);
                alert("配置の更新に失敗しました");
            }
            return;
        }

        // 新しいassignmentを作成する場合
        if (pendingPlacement.mode === "guest") {
            // ゲストの場合は未配置として保存（gridX/gridYをnull）
            try {
                await assignCast(session.id, pendingPlacement.profile.id, "waiting", pendingPlacement.profile.id, null, null);
                setPendingPlacement(null);
                setIsSeatSelectionOpen(false);
                await onUpdate();
            } catch (error) {
                console.error("Failed to assign:", error);
                alert("配置に失敗しました");
            }
        } else {
            // キャストの場合は未配置として保存
            try {
                const now = new Date();
                const nowStr = now.toTimeString().slice(0, 5); // HH:MM
                const today = new Date().toISOString().split('T')[0];
                const startTimeISO = `${today}T${nowStr}:00`;

                await assignCast(
                    session.id,
                    pendingPlacement.profile.id,
                    "waiting",
                    pendingPlacement.guestId,
                    null,
                    null,
                    startTimeISO,
                    null
                );
                setPendingPlacement(null);
                setIsSeatSelectionOpen(false);
                await onUpdate();
            } catch (error) {
                console.error("Failed to assign:", error);
                alert("配置に失敗しました");
            }
        }
    };

    const handleCastDetailSubmit = async () => {
        if (!castDetailEdit) return;

        try {
            // 時刻をISO形式に変換
            const today = new Date().toISOString().split('T')[0];
            const startTimeISO = castDetailEdit.startTime ? `${today}T${castDetailEdit.startTime}:00` : new Date().toISOString();
            const endTimeISO = castDetailEdit.endTime ? `${today}T${castDetailEdit.endTime}:00` : null;

            await assignCast(
                session.id,
                castDetailEdit.profile.id,
                castDetailEdit.status,
                castDetailEdit.guestId,
                castDetailEdit.gridX,
                castDetailEdit.gridY,
                startTimeISO,
                endTimeISO
            );
            setCastDetailEdit(null);
            await onUpdate();
        } catch (error) {
            console.error("Failed to assign cast:", error);
            alert("配置に失敗しました");
        }
    };

    const handleSeatSelectionClose = () => {
        setIsSeatSelectionOpen(false);
        setPendingPlacement(null);
    };


    const handleDeleteAssignment = async () => {
        if (!deleteConfirm) return;
        try {
            await removeCastAssignment(deleteConfirm.id);
            setDeleteConfirm(null);
            setOpenMenuId(null);
            await onUpdate();
        } catch (error) {
            console.error("Failed to delete assignment:", error);
            alert("削除に失敗しました");
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent
                    className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-3 sm:p-4 md:p-5"
                    onPointerDownOutside={slipIsOpen ? (e) => e.preventDefault() : undefined}
                    onInteractOutside={slipIsOpen ? (e) => e.preventDefault() : undefined}
                >
                    <DialogHeader className="mb-3 sm:mb-4 flex flex-row items-center justify-between gap-2 relative">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-0"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-xl font-bold flex items-center justify-center gap-2">
                            {table?.name || "テーブル未設定"}
                            <span className="text-sm font-normal text-muted-foreground">
                                {session.guest_count}名
                            </span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            セッション詳細
                        </DialogDescription>
                        <button
                            type="button"
                            onClick={() => setShowActions(!showActions)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                            aria-label="オプション"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {showActions && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                                <div className="absolute right-0 top-10 z-50 w-40 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-2 flex flex-col gap-1 text-sm animate-in fade-in zoom-in-95 duration-100">
                                    <button
                                        type="button"
                                        className="w-full text-left px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                                        onClick={() => {
                                            setShowActions(false);
                                            setCloseConfirm(true);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        削除
                                    </button>
                                </div>
                            </>
                        )}
                    </DialogHeader>

                    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        {/* View toggle + slip button */}
                        <div className="flex items-center justify-between gap-3 flex-shrink-0 mb-4">
                            <div className="relative flex items-center w-36 bg-slate-100 dark:bg-slate-800 rounded-full p-1 overflow-hidden">
                                <div
                                    className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-white dark:bg-slate-900 shadow-sm transition-all duration-200 ease-out ${viewMode === "table" ? "left-1" : "left-[50%]"
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setViewMode("table")}
                                    className={`relative z-10 flex-1 px-2 py-1.5 text-sm font-medium text-center whitespace-nowrap transition-colors ${viewMode === "table"
                                        ? "text-slate-900 dark:text-white"
                                        : "text-slate-600 dark:text-slate-300"
                                        }`}
                                >
                                    カード
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode("grid")}
                                    className={`relative z-10 flex-1 px-2 py-1.5 text-sm font-medium text-center whitespace-nowrap transition-colors ${viewMode === "grid"
                                        ? "text-slate-900 dark:text-white"
                                        : "text-slate-600 dark:text-slate-300"
                                        }`}
                                >
                                    グリッド
                                </button>
                            </div>

                            <Button
                                type="button"
                                className="h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-md shrink-0 px-4"
                                onClick={() => onOpenSlip?.(session.id)}
                                aria-label="伝票を開く"
                            >
                                <Receipt className="h-5 w-5 mr-2" />
                                伝票
                            </Button>
                        </div>

                        {/* Scrollable content area */}
                        <div className="flex-1 min-h-0 overflow-y-auto">

                            {/* Guest Cards with Cast Assignments (Tree View) */}
                            {viewMode === "table" && guests.length > 0 && (
                                <div className="flex flex-col gap-3">
                                    {guests.map((guest: any) => {
                                        const guestCasts = (guestGroups[guest.id]?.casts || []).sort((a: any, b: any) => {
                                            const getTimeValue = (isoString: string | null) => {
                                                if (!isoString) return 0;
                                                const date = new Date(isoString);
                                                const hours = date.getHours();
                                                const minutes = date.getMinutes();
                                                const totalMinutes = hours * 60 + minutes;

                                                // 日付切り替え時間を分に変換
                                                const [switchHours, switchMinutes] = daySwitchTime.split(':').map(Number);
                                                const switchTotalMinutes = switchHours * 60 + switchMinutes;

                                                // 日付切り替え時間より前の場合は翌日扱い（+24時間）
                                                if (totalMinutes < switchTotalMinutes) {
                                                    return totalMinutes + 24 * 60;
                                                }
                                                return totalMinutes;
                                            };

                                            const timeA = getTimeValue(a.start_time);
                                            const timeB = getTimeValue(b.start_time);
                                            return timeA - timeB;
                                        });
                                        return (
                                            <div
                                                key={guest.id}
                                                className="rounded-xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
                                            >
                                                {/* Guest Header */}
                                                <div
                                                    className="flex items-center p-3 border-b cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                                    onClick={() => {
                                                        const newSet = new Set(expandedGuestIds);
                                                        if (newSet.has(guest.id)) {
                                                            newSet.delete(guest.id);
                                                        } else {
                                                            newSet.add(guest.id);
                                                        }
                                                        setExpandedGuestIds(newSet);
                                                    }}
                                                >
                                                    <Avatar className="h-10 w-10 mr-3">
                                                        <AvatarImage src={guest.avatar_url} />
                                                        <AvatarFallback>
                                                            {guest.display_name?.[0] || "?"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium text-sm flex-1 flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            {guest.display_name || "不明"}
                                                            {(() => {
                                                                const activeCasts = guestCasts.filter((c: any) =>
                                                                    ['serving', 'jonai', 'shimei'].includes(c.status)
                                                                );

                                                                if (activeCasts.length > 0) {
                                                                    return (
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {activeCasts.map((cast: any) => (
                                                                                <span key={cast.id} className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded-md">
                                                                                    {cast.profiles?.display_name}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    );
                                                                } else {
                                                                    return (
                                                                        <span className="text-xs font-bold text-red-500 border border-red-500 px-1.5 py-0.5 rounded-md">
                                                                            オンリー
                                                                        </span>
                                                                    );
                                                                }
                                                            })()}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <span className="shrink-0">待機:</span>
                                                            {(() => {
                                                                const waitingCasts = guestCasts.filter((c: any) => c.status === 'waiting');

                                                                if (waitingCasts.length > 0) {
                                                                    return (
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {waitingCasts.map((cast: any) => (
                                                                                <span key={cast.id} className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-1.5 py-0.5 rounded-md">
                                                                                    {cast.profiles?.display_name}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    );
                                                                } else {
                                                                    return <span>なし</span>;
                                                                }
                                                            })()}
                                                        </div>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                                    >
                                                        {expandedGuestIds.has(guest.id) ? (
                                                            <ChevronUp className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronDown className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Accordion Body */}
                                                {expandedGuestIds.has(guest.id) && (
                                                    <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50">
                                                        {/* Cast List (Tree View) */}
                                                        {guestCasts.length > 0 && (
                                                            <div className="pl-6 mb-3">
                                                                {guestCasts.map((cast: any, index: number) => (
                                                                    <div
                                                                        key={cast.id}
                                                                        className="flex items-center relative"
                                                                    >
                                                                        {/* Tree guide lines */}
                                                                        <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-300 dark:bg-slate-600" style={{ left: '-12px' }} />
                                                                        <div className="absolute top-8 w-3 h-px bg-slate-300 dark:bg-slate-600" style={{ left: '-12px' }} />

                                                                        <div className="flex flex-col py-2 flex-1 gap-2 relative">
                                                                            {/* ...ボタンを右上に配置 */}
                                                                            <div className="absolute right-0 top-2">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setOpenMenuId(openMenuId === `cast-${cast.id}` ? null : `cast-${cast.id}`)}
                                                                                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                                                                >
                                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                                </button>
                                                                                {openMenuId === `cast-${cast.id}` && (
                                                                                    <>
                                                                                        <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                                                                        <div className="absolute right-0 top-6 z-50 w-32 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-1 text-sm animate-in fade-in zoom-in-95 duration-100">
                                                                                            <button
                                                                                                type="button"
                                                                                                className="w-full text-left px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                                                                onClick={() => {
                                                                                                    setDeleteConfirm({ id: cast.id, name: cast.profiles?.display_name || "不明" });
                                                                                                    setOpenMenuId(null);
                                                                                                }}
                                                                                            >
                                                                                                削除
                                                                                            </button>
                                                                                        </div>
                                                                                    </>
                                                                                )}
                                                                            </div>

                                                                            {/* 1行目: アイコン、名前、ステータス */}
                                                                            <div className="flex items-center pr-8">
                                                                                <Avatar className="h-8 w-8 mr-2">
                                                                                    <AvatarImage src={cast.profiles?.avatar_url} />
                                                                                    <AvatarFallback className="text-xs">
                                                                                        {cast.profiles?.display_name?.[0] || "?"}
                                                                                    </AvatarFallback>
                                                                                </Avatar>
                                                                                <span className="text-sm font-medium">
                                                                                    {cast.profiles?.display_name || "不明"}
                                                                                </span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setStatusEdit({ id: cast.id, name: cast.profiles?.display_name || "不明", currentStatus: cast.status || "waiting" })}
                                                                                    className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusOption(cast.status).color}`}
                                                                                >
                                                                                    {getStatusOption(cast.status).label}
                                                                                </button>
                                                                            </div>

                                                                            {/* 2行目: 時間入力 */}
                                                                            <div className="flex items-center gap-1 ml-10">
                                                                                <Input
                                                                                    type="time"
                                                                                    value={cast.start_time ? new Date(cast.start_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : ""}
                                                                                    onChange={(e) => {
                                                                                        const baseDate = cast.start_time ? new Date(cast.start_time).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
                                                                                        const newStartTime = new Date(`${baseDate}T${e.target.value}`).toISOString();
                                                                                        updateCastAssignmentTimes(cast.id, newStartTime).then(() => onUpdate());
                                                                                    }}
                                                                                    className="h-7 w-20 text-base px-2"
                                                                                />
                                                                                <span className="text-xs text-muted-foreground">-</span>
                                                                                <Input
                                                                                    type="time"
                                                                                    value={cast.end_time ? new Date(cast.end_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : ""}
                                                                                    onChange={(e) => {
                                                                                        if (!e.target.value) {
                                                                                            updateCastAssignmentTimes(cast.id, undefined, null).then(() => onUpdate());
                                                                                            return;
                                                                                        }
                                                                                        const baseDate = cast.start_time ? new Date(cast.start_time).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
                                                                                        const newEndTime = new Date(`${baseDate}T${e.target.value}`).toISOString();
                                                                                        updateCastAssignmentTimes(cast.id, undefined, newEndTime).then(() => onUpdate());
                                                                                    }}
                                                                                    className="h-7 w-20 text-base px-2"
                                                                                    placeholder="--:--"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Actions Footer */}
                                                        <div className="flex gap-2 mt-2">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                className="flex-1 h-9 text-xs"
                                                                onClick={() => handleAddCastToGuest(guest.id)}
                                                            >
                                                                <UserPlus className="h-3 w-3 mr-1.5" />
                                                                キャスト追加
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-9 w-9 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                onClick={() => {
                                                                    const guestAssignment = castAssignments.find((a: any) => a.guest_id === guest.id && a.cast_id === guest.id);
                                                                    if (guestAssignment) {
                                                                        setDeleteConfirm({ id: guestAssignment.id, name: guest.display_name || "不明" });
                                                                    }
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )
                                                }
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {viewMode === "table" && guests.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed">
                                    <p className="text-sm">ゲストが登録されていません</p>
                                    <p className="text-xs mt-1">「ゲスト」ボタンから追加してください</p>
                                </div>
                            )}

                            {/* Table Grid */}
                            {viewMode === "grid" && (
                                <div className="w-full space-y-4">
                                    {table?.layout_data?.grid ? (
                                        <div className="w-full flex justify-center p-2">
                                            <ScalableGridWrapper
                                                grid={table.layout_data.grid}
                                                assignments={castAssignments.filter((a: any) =>
                                                    // ゲストは常に表示、キャストは接客中、場内、指名のみ表示
                                                    a.guest_id === a.cast_id ||
                                                    a.status === 'serving' || a.status === 'jonai' || a.status === 'shimei'
                                                )}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed">
                                            <p className="text-sm">テーブルが設定されていません</p>
                                            <p className="text-xs mt-1">グリッドビューを使用するにはテーブルを設定してください</p>
                                        </div>
                                    )}

                                    {/* Unassigned Items */}
                                    {(() => {
                                        const unassignedItems = castAssignments.filter(
                                            (assignment: any) =>
                                                assignment.grid_x === null ||
                                                assignment.grid_y === null ||
                                                assignment.grid_x === undefined ||
                                                assignment.grid_y === undefined
                                        );

                                        if (unassignedItems.length === 0) return null;

                                        return (
                                            <div className="border rounded-lg overflow-hidden">
                                                <div className="px-3 py-2 bg-muted/50 border-b">
                                                    <span className="font-medium text-xs">未配置</span>
                                                </div>
                                                <div className="divide-y">
                                                    {unassignedItems.map((assignment: any) => {
                                                        const isGuest = assignment.cast_id === assignment.guest_id;
                                                        return (
                                                            <div
                                                                key={assignment.id}
                                                                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                                                                onClick={() => {
                                                                    // クリックで席選択モーダルを開く
                                                                    setPendingPlacement({
                                                                        profile: assignment.profiles,
                                                                        mode: isGuest ? "guest" : "cast",
                                                                        guestId: assignment.guest_id,
                                                                        assignmentId: assignment.id
                                                                    });
                                                                    setIsSeatSelectionOpen(true);
                                                                }}
                                                            >
                                                                <Avatar className="h-6 w-6">
                                                                    <AvatarImage src={assignment.profiles?.avatar_url} />
                                                                    <AvatarFallback className="text-[10px]">
                                                                        {assignment.profiles?.display_name?.[0] || "?"}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-xs flex-1">{assignment.profiles?.display_name || "不明"}</span>
                                                                <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setDeleteConfirm({ id: assignment.id, name: assignment.profiles?.display_name || "不明" })}
                                                                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                                                                    >
                                                                        <MoreHorizontal className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>

                        {/* Add Guest Button at Bottom */}
                        <div className="mt-4">
                            <Button
                                type="button"
                                className="w-full h-12 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                                onClick={handleAddGuest}
                                aria-label="ゲストを追加"
                            >
                                <UserPlus className="h-5 w-5 mr-2" />
                                ゲスト
                            </Button>
                        </div>
                    </div>
                </DialogContent >
            </Dialog >

            {isPlacementOpen && (
                <PlacementModal
                    isOpen={isPlacementOpen}
                    onClose={() => setIsPlacementOpen(false)}
                    mode={placementMode}
                    onProfileSelect={handleProfileSelect}
                    sessionId={session.id}
                />
            )
            }

            {
                isSeatSelectionOpen && pendingPlacement && table && (
                    <SeatSelectionModal
                        isOpen={isSeatSelectionOpen}
                        onClose={handleSeatSelectionClose}
                        onSeatSelect={handleSeatSelect}
                        onSkip={handleSkipPlacement}
                        table={table}
                        assignments={castAssignments}
                        selectedProfile={pendingPlacement.profile}
                        mode={pendingPlacement.mode}
                    />
                )
            }

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>削除の確認</DialogTitle>
                        <DialogDescription>
                            「{deleteConfirm?.name}」の配置を削除しますか？
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteConfirm(null)}
                        >
                            キャンセル
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDeleteAssignment}
                        >
                            削除
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Status Edit Modal */}
            <Dialog open={!!statusEdit} onOpenChange={() => setStatusEdit(null)}>
                <DialogContent className="max-w-xs">
                    <DialogHeader>
                        <DialogTitle>ステータス変更</DialogTitle>
                        <DialogDescription>
                            「{statusEdit?.name}」のステータスを選択
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 py-2">
                        {CAST_STATUS_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`w-full text-left px-4 py-3 rounded-lg transition-colors text-sm font-medium ${statusEdit?.currentStatus === option.value
                                    ? option.color + " ring-2 ring-offset-2 ring-blue-500"
                                    : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                onClick={async () => {
                                    if (statusEdit) {
                                        await updateCastAssignmentStatus(statusEdit.id, option.value);
                                        setStatusEdit(null);
                                        await onUpdate();
                                    }
                                }}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Cast Detail Edit Modal */}
            <Dialog open={!!castDetailEdit} onOpenChange={() => setCastDetailEdit(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>キャスト配置設定</DialogTitle>
                        <DialogDescription>
                            {castDetailEdit?.profile?.display_name}の接客設定
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-2">
                        {/* Start Time */}
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                開始時間
                            </label>
                            <input
                                type="time"
                                value={castDetailEdit?.startTime || ""}
                                onChange={(e) => setCastDetailEdit(prev => prev ? { ...prev, startTime: e.target.value } : null)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            />
                        </div>

                        {/* End Time */}
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                終了時間（任意）
                            </label>
                            <input
                                type="time"
                                value={castDetailEdit?.endTime || ""}
                                onChange={(e) => setCastDetailEdit(prev => prev ? { ...prev, endTime: e.target.value } : null)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            />
                        </div>

                        {/* Status */}
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                ステータス
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {CAST_STATUS_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${castDetailEdit?.status === option.value
                                            ? option.color + " ring-2 ring-offset-1 ring-blue-500"
                                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                                            }`}
                                        onClick={() => setCastDetailEdit(prev => prev ? { ...prev, status: option.value } : null)}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCastDetailEdit(null)}
                        >
                            キャンセル
                        </Button>
                        <Button
                            type="button"
                            onClick={handleCastDetailSubmit}
                        >
                            配置
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Close Session Confirmation Modal */}
            <Dialog open={closeConfirm} onOpenChange={setCloseConfirm}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>セッションを削除しますか？</DialogTitle>
                        <DialogDescription>
                            この操作は取り消せません。関連する伝票やキャストの割り当て情報もすべて削除されます。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCloseConfirm(false)}
                        >
                            キャンセル
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDeleteSession}
                        >
                            削除する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
