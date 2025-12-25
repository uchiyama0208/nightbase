"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TableSession, Table } from "@/types/floor";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList, Users } from "lucide-react";
import Link from "next/link";
import {
    Table as UITable,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatJSTTime } from "@/lib/utils";
import { NewSessionModal } from "./new-session-modal";
import { SessionDetailModalV2 } from "./session-detail-modal-v2";
import { QuickOrderModal } from "./quick-order-modal";
import { SlipDetailModal } from "@/components/slips/slip-detail-modal";
import { SessionCard } from "./components/session-card";
import { ReservationCard } from "./components/reservation-card";
import { QueueCard } from "./components/queue-card";
import { ReservationAddModal } from "../reservations/reservation-add-modal";
import { ReservationEditModal } from "../reservations/reservation-edit-modal";
import { useFloorData } from "./hooks";
import { EMPTY_MESSAGES } from "./constants";
import { getFloorPageData } from "./actions/session";
import { VercelTabs } from "@/components/ui/vercel-tabs";

interface PagePermissions {
    bottles: boolean;
    resumes: boolean;
    salarySystems: boolean;
    attendance: boolean;
    personalInfo: boolean;
}

// スケルトンコンポーネント
function FloorSkeleton() {
    return (
        <div className="h-full flex flex-col space-y-3 p-1 md:p-4">
            {/* Header */}
            <div className="flex items-center justify-end gap-2">
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <div className="flex-1 py-2 flex justify-center">
                    <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="flex-1 py-2 flex justify-center">
                    <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="flex-1 py-2 flex justify-center">
                    <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
            </div>

            {/* Session Cards */}
            <div className="grid grid-cols-2 gap-2 md:gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 animate-pulse">
                        <div className="flex items-center justify-between">
                            <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        </div>
                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="flex gap-2">
                            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function FloorClient() {
    // 権限データを取得（キャッシュあり）
    const { data: pageData, isLoading: isLoadingPermissions } = useQuery({
        queryKey: ["floor", "permissions"],
        queryFn: async () => {
            const result = await getFloorPageData();
            if ("redirect" in result) {
                // リダイレクトが必要な場合はwindow.locationで遷移
                if (result.redirect) {
                    window.location.href = result.redirect;
                }
                return null;
            }
            return result.data;
        },
        staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    });

    const canEdit = pageData?.canEdit ?? false;
    const pagePermissions = pageData?.pagePermissions;

    const {
        tables,
        sessions,
        reservations,
        queueEntries,
        activeCount,
        reservedCount,
        selectedSession,
        selectedTable,
        setSelectedSession,
        setSelectedTable,
        loadData,
        removeSessionOptimistic,
        currentTab,
        setCurrentTab,
        storeId,
        isLoading: isLoadingData,
    } = useFloorData();

    // 件数付きタブを生成
    const tabsWithCount = [
        { key: "active" as const, label: `進行中 (${activeCount})` },
        { key: "reserved" as const, label: `予約 (${reservedCount})` },
        { key: "completed" as const, label: "終了済み" },
    ];

    const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
    const [isReservationAddOpen, setIsReservationAddOpen] = useState(false);
    const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
    const [quickOrderSession, setQuickOrderSession] = useState<TableSession | null>(null);
    const [quickOrderTable, setQuickOrderTable] = useState<Table | null>(null);
    const [slipSessionId, setSlipSessionId] = useState<string | null>(null);

    const handleSessionClick = (session: TableSession) => {
        const table = tables.find(t => t.id === session.table_id) || null;
        setSelectedSession(session);
        setSelectedTable(table);
    };

    const handleQuickOrder = (session: TableSession, table: Table | null) => {
        setQuickOrderSession(session);
        setQuickOrderTable(table);
    };

    // 初回ロード中（キャッシュなし）の場合のみスケルトン表示
    if (isLoadingPermissions && isLoadingData) {
        return <FloorSkeleton />;
    }

    return (
        <div className="h-full flex flex-col space-y-3 p-1 md:p-4">
            <div className="flex items-center justify-end gap-2">
                <Link href="/app/orders">
                    <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 rounded-full bg-white dark:bg-gray-800 border-none shadow-md transition-all hover:scale-105 active:scale-95 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        <ClipboardList className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </Button>
                </Link>
                <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 rounded-full bg-white dark:bg-gray-800 border-none shadow-md transition-all hover:scale-105 active:scale-95 hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => {
                        // FUTURE: キャスト機能を追加
                    }}
                >
                    <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Button>
                {canEdit && (
                    <Button
                        size="icon"
                        className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                        onClick={() => {
                            if (currentTab === "reserved") {
                                setIsReservationAddOpen(true);
                            } else {
                                setIsNewSessionOpen(true);
                            }
                        }}
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {/* Vercel-style Tab Navigation */}
            <VercelTabs
                tabs={tabsWithCount}
                value={currentTab}
                onChange={(val) => setCurrentTab(val as typeof currentTab)}
            />

            {currentTab === "reserved" ? (
                <div className="space-y-4">
                    {/* 予約セクション */}
                    {reservations.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                                予約 ({reservations.length})
                            </h3>
                            <div className="grid grid-cols-2 gap-2 md:gap-4">
                                {reservations.map(reservation => (
                                    <ReservationCard
                                        key={reservation.id}
                                        reservation={reservation}
                                        onUpdate={() => loadData()}
                                        onSessionCreated={() => {
                                            setCurrentTab("active");
                                        }}
                                        onClick={() => setEditingReservationId(reservation.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* キューセクション */}
                    {queueEntries.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                                順番待ち ({queueEntries.length})
                            </h3>
                            <div className="grid grid-cols-2 gap-2 md:gap-4">
                                {queueEntries.map(entry => (
                                    <QueueCard
                                        key={entry.id}
                                        entry={entry}
                                        onUpdate={() => loadData()}
                                        onSessionCreated={() => {
                                            setCurrentTab("active");
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 両方空の場合 */}
                    {reservations.length === 0 && queueEntries.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed">
                            {EMPTY_MESSAGES.reserved.title}
                        </div>
                    )}
                </div>
            ) : currentTab === "completed" ? (
                /* 終了済み - テーブルビュー */
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {sessions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            {EMPTY_MESSAGES.completed.title}
                        </div>
                    ) : (
                        <UITable>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-20">卓</TableHead>
                                    <TableHead>ゲスト</TableHead>
                                    <TableHead className="w-24">人数</TableHead>
                                    <TableHead className="w-32">時間</TableHead>
                                    <TableHead className="w-28 text-right">合計</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions.map(session => {
                                    const table = tables.find(t => t.id === session.table_id);
                                    const mainGuest = session.session_guests?.find(g => g.guest_id === session.main_guest_id);
                                    const guestName = mainGuest?.profiles?.display_name || mainGuest?.guest_name || "ゲスト";
                                    return (
                                        <TableRow
                                            key={session.id}
                                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                                            onClick={() => {
                                                setSelectedSession(session);
                                                setSelectedTable(table || null);
                                            }}
                                        >
                                            <TableCell className="font-medium">
                                                {table?.name || "-"}
                                            </TableCell>
                                            <TableCell>
                                                {guestName}
                                            </TableCell>
                                            <TableCell>
                                                {session.guest_count}名
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatJSTTime(session.start_time)}
                                                {session.end_time && ` - ${formatJSTTime(session.end_time)}`}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                ¥{(session.total_amount || 0).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </UITable>
                    )}
                </div>
            ) : (
                /* 進行中 - カードビュー */
                <div className="grid grid-cols-2 gap-2 md:gap-4">
                    {sessions.map(session => {
                        const table = tables.find(t => t.id === session.table_id);
                        return (
                            <SessionCard
                                key={session.id}
                                session={session}
                                table={table}
                                onSessionClick={handleSessionClick}
                                onQuickOrder={handleQuickOrder}
                            />
                        );
                    })}
                    {sessions.length === 0 && !isLoadingData && (
                        <div className="col-span-full text-center py-12 text-muted-foreground bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed">
                            {EMPTY_MESSAGES[currentTab].title}
                            {EMPTY_MESSAGES[currentTab].subtitle && (
                                <>
                                    <br />
                                    {EMPTY_MESSAGES[currentTab].subtitle}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            <NewSessionModal
                isOpen={isNewSessionOpen}
                onClose={() => setIsNewSessionOpen(false)}
                tables={tables}
                onSessionCreated={(sessionId) => loadData(sessionId)}
            />

            {storeId && (
                <>
                    <ReservationAddModal
                        isOpen={isReservationAddOpen}
                        onClose={() => setIsReservationAddOpen(false)}
                        storeId={storeId}
                        onSuccess={() => {
                            loadData();
                        }}
                    />
                    <ReservationEditModal
                        isOpen={!!editingReservationId}
                        onClose={() => setEditingReservationId(null)}
                        storeId={storeId}
                        reservationId={editingReservationId || ""}
                        onSuccess={() => {
                            loadData();
                        }}
                    />
                </>
            )}

            {/* 常にレンダリングし、isOpenで表示制御（データ更新中のちらつき防止） */}
            <SessionDetailModalV2
                isOpen={!!selectedSession}
                onClose={() => {
                    setSelectedSession(null);
                    setSlipSessionId(null);
                }}
                session={selectedSession}
                table={selectedTable}
                onUpdate={async (sessionId?: string) => { await loadData(sessionId ?? selectedSession?.id); }}
                onDeleteSession={(sessionId) => removeSessionOptimistic(sessionId)}
                onOpenSlip={(sessionId) => {
                    setSlipSessionId(sessionId);
                }}
                slipIsOpen={!!slipSessionId}
                pagePermissions={pagePermissions}
            />

            {quickOrderSession && (
                <QuickOrderModal
                    session={quickOrderSession}
                    table={quickOrderTable}
                    open={!!quickOrderSession}
                    onOpenChange={(open) => {
                        if (!open) {
                            setQuickOrderSession(null);
                            setQuickOrderTable(null);
                        }
                    }}
                    onOrderComplete={loadData}
                />
            )}

            <SlipDetailModal
                isOpen={!!slipSessionId}
                onClose={() => setSlipSessionId(null)}
                sessionId={slipSessionId}
                onUpdate={loadData}
                onSessionDeleted={() => {
                    setSlipSessionId(null);
                    setSelectedSession(null);
                }}
                editable={true}
                initialTables={tables}
                initialSessions={sessions}
                preventOutsideClose={true}
            />
        </div >
    );
}
