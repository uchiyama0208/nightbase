"use client";

import { useState } from "react";
import { TableSession, Table } from "@/types/floor";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList } from "lucide-react";
import Link from "next/link";
import { NewSessionModal } from "./new-session-modal";
import { SessionDetailModalV2 } from "./session-detail-modal-v2";
import { QuickOrderModal } from "./quick-order-modal";
import { SlipDetailModal } from "@/components/slips/slip-detail-modal";
import { SessionCard } from "./components/session-card";
import { ReservationCard } from "./components/reservation-card";
import { ReservationAddModal } from "../reservations/reservation-add-modal";
import { ReservationEditModal } from "../reservations/reservation-edit-modal";
import { useFloorData, useTabIndicator } from "./hooks";
import { FLOOR_TABS, EMPTY_MESSAGES } from "./constants";

export function FloorClient() {
    const {
        tables,
        sessions,
        reservations,
        selectedSession,
        selectedTable,
        setSelectedSession,
        setSelectedTable,
        loadData,
        currentTab,
        setCurrentTab,
        storeId,
    } = useFloorData();

    const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
    const [isReservationAddOpen, setIsReservationAddOpen] = useState(false);
    const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
    const [quickOrderSession, setQuickOrderSession] = useState<TableSession | null>(null);
    const [quickOrderTable, setQuickOrderTable] = useState<Table | null>(null);
    const [slipSessionId, setSlipSessionId] = useState<string | null>(null);

    // Vercel風タブインジケーター
    const { tabsRef, indicatorStyle } = useTabIndicator(currentTab);

    const handleSessionClick = (session: TableSession) => {
        const table = tables.find(t => t.id === session.table_id) || null;
        setSelectedSession(session);
        setSelectedTable(table);
    };

    const handleQuickOrder = (session: TableSession, table: Table | null) => {
        setQuickOrderSession(session);
        setQuickOrderTable(table);
    };

    return (
        <div className="h-full flex flex-col space-y-3 p-1 md:p-4">
            <div className="flex items-center justify-end gap-2">
                <Link href="/app/orders">
                    <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 rounded-full border-gray-300 dark:border-gray-600 shadow-sm transition-all hover:scale-105 active:scale-95"
                    >
                        <ClipboardList className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </Button>
                </Link>
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
            </div>

            {/* Vercel-style Tab Navigation */}
            <div className="relative">
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    {FLOOR_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            ref={(el) => { tabsRef.current[tab.key] = el; }}
                            type="button"
                            onClick={() => setCurrentTab(tab.key)}
                            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                                currentTab === tab.key
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

            <div className="grid grid-cols-2 gap-2 md:gap-4">
                {currentTab === "reserved" ? (
                    <>
                        {reservations.map(reservation => (
                            <ReservationCard
                                key={reservation.id}
                                reservation={reservation}
                                onUpdate={() => loadData()}
                                onSessionCreated={() => {
                                    // すぐにタブを切り替え
                                    setCurrentTab("active");
                                }}
                                onClick={() => setEditingReservationId(reservation.id)}
                            />
                        ))}
                        {reservations.length === 0 && (
                            <div className="col-span-full text-center py-12 text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed">
                                {EMPTY_MESSAGES.reserved.title}
                            </div>
                        )}
                    </>
                ) : (
                    <>
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
                        {sessions.length === 0 && (
                            <div className="col-span-full text-center py-12 text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed">
                                {EMPTY_MESSAGES[currentTab].title}
                                {EMPTY_MESSAGES[currentTab].subtitle && (
                                    <>
                                        <br />
                                        {EMPTY_MESSAGES[currentTab].subtitle}
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

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

            {
                selectedSession && (
                    <SessionDetailModalV2
                        isOpen={!!selectedSession}
                        onClose={() => {
                            setSelectedSession(null);
                            setSlipSessionId(null);
                        }}
                        session={selectedSession}
                        table={selectedTable}
                        onUpdate={() => loadData(selectedSession.id)}
                        onOpenSlip={(sessionId) => {
                            setSlipSessionId(sessionId);
                        }}
                        slipIsOpen={!!slipSessionId}
                    />
                )
            }

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
                editable={true}
                initialTables={tables}
                initialSessions={sessions}
                preventOutsideClose={true}
            />
        </div >
    );
}
