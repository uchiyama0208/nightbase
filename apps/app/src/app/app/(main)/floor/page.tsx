"use client";

import { useState } from "react";
import { TableSession } from "@/types/floor";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { NewSessionModal } from "./new-session-modal";
import { SessionDetailModal } from "./session-detail-modal";
import { QuickOrderModal } from "./quick-order-modal";
import { SlipDetailModal } from "@/components/slips/slip-detail-modal";
import { SessionCard } from "./components/session-card";
import { useFloorData } from "./hooks/use-floor-data";

export default function FloorPage() {
    const {
        tables,
        sessions,
        selectedSession,
        selectedTable,
        setSelectedSession,
        setSelectedTable,
        loadData,
        showCompleted,
        setShowCompleted,
    } = useFloorData();

    const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
    const [quickOrderSession, setQuickOrderSession] = useState<TableSession | null>(null);
    const [quickOrderTable, setQuickOrderTable] = useState<any>(null);
    const [slipSessionId, setSlipSessionId] = useState<string | null>(null);

    const handleSessionClick = (session: TableSession) => {
        const table = tables.find(t => t.id === session.table_id) || null;
        setSelectedSession(session);
        setSelectedTable(table);
    };

    const handleQuickOrder = (session: TableSession, table: any) => {
        setQuickOrderSession(session);
        setQuickOrderTable(table);
    };

    return (
        <div className="h-full flex flex-col space-y-3 p-1 md:p-4">
            <div>
                <h1 className="text-2xl font-bold">フロア管理</h1>
            </div>
            <div className="flex items-center justify-between">
                {/* Toggle Button */}
                <div className="relative inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
                    <div
                        className="absolute h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-transform duration-300 ease-in-out"
                        style={{
                            width: "80px",
                            left: "4px",
                            transform: `translateX(calc(${showCompleted ? 1 : 0} * (80px + 0px)))`
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => setShowCompleted(false)}
                        className={`relative z-10 w-20 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${!showCompleted ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
                    >
                        進行中
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowCompleted(true)}
                        className={`relative z-10 w-20 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${showCompleted ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
                    >
                        終了済み
                    </button>
                </div>
                <Button
                    size="icon"
                    className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                    onClick={() => setIsNewSessionOpen(true)}
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </div>

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
                {sessions.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed">
                        {showCompleted ? "終了済みのセッションはありません" : "アクティブなセッションはありません"}
                        <br />
                        {!showCompleted && "右上のボタンから新規セッションを開始してください"}
                    </div>
                )}
            </div>

            <NewSessionModal
                isOpen={isNewSessionOpen}
                onClose={() => setIsNewSessionOpen(false)}
                tables={tables}
                onSessionCreated={(sessionId) => loadData(sessionId)}
            />

            {
                selectedSession && (
                    <SessionDetailModal
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

            {
                quickOrderSession && quickOrderTable && (
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
                )
            }

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
