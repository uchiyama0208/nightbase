"use client";

import { useState, useEffect } from "react";
import { Table, TableSession } from "@/types/floor";
import { getTables } from "../floor-settings/actions";
import { getActiveSessions } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Zap } from "lucide-react";
import { NewSessionModal } from "./new-session-modal";
import { SessionDetailModal } from "./session-detail-modal";

export default function FloorPage() {
    const [tables, setTables] = useState<Table[]>([]);
    const [sessions, setSessions] = useState<TableSession[]>([]);
    const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<TableSession | null>(null);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        const [tablesData, sessionsData] = await Promise.all([
            getTables(),
            getActiveSessions(),
        ]);
        setTables(tablesData);
        setSessions(sessionsData as any);
    };

    const handleSessionClick = (session: TableSession) => {
        const table = tables.find(t => t.id === session.table_id);
        if (table) {
            setSelectedSession(session);
            setSelectedTable(table);
        }
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Tokyo",
        });
    };

    return (
        <div className="h-full flex flex-col space-y-4 p-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">フロア管理</h1>
                <Button onClick={() => setIsNewSessionOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    新規セッション
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {sessions.map(session => {
                    const table = tables.find(t => t.id === session.table_id);
                    return (
                        <Card
                            key={session.id}
                            className="cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                            onClick={() => handleSessionClick(session)}
                        >
                            <CardHeader className="pb-3">
                                <CardTitle className="text-2xl mb-2 text-slate-900 dark:text-slate-100">{table?.name || "不明"}</CardTitle>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {formatTime(session.start_time)}〜
                                    </div>
                                    <Badge variant="secondary">{session.guest_count}名</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-end">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // TODO: Implement quick order
                                        }}
                                    >
                                        <Zap className="h-4 w-4 mr-2" />
                                        クイック注文
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
                {sessions.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed">
                        アクティブなセッションはありません
                        <br />
                        右上のボタンから新規セッションを開始してください
                    </div>
                )}
            </div>

            <NewSessionModal
                isOpen={isNewSessionOpen}
                onClose={() => setIsNewSessionOpen(false)}
                tables={tables}
                onSessionCreated={loadData}
            />

            {selectedSession && selectedTable && (
                <SessionDetailModal
                    isOpen={!!selectedSession}
                    onClose={() => setSelectedSession(null)}
                    session={selectedSession}
                    table={selectedTable}
                    onUpdate={loadData}
                />
            )}
        </div>
    );
}
