"use client";

import { useState, useEffect } from "react";
import { Table, TableSession } from "@/types/floor";
import { getTables } from "../seats/actions";
import { getActiveSessions } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Zap, Users } from "lucide-react";
import { NewSessionModal } from "./new-session-modal";
import { SessionDetailModal } from "./session-detail-modal";
import { QuickOrderModal } from "./quick-order-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function FloorPage() {
    const [tables, setTables] = useState<Table[]>([]);
    const [sessions, setSessions] = useState<TableSession[]>([]);
    const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<TableSession | null>(null);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [quickOrderSession, setQuickOrderSession] = useState<TableSession | null>(null);
    const [quickOrderTable, setQuickOrderTable] = useState<Table | null>(null);

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

        // Ensure the currently selected session/table are refreshed with latest data
        setSelectedSession((prev) => {
            if (!prev) return prev;
            const updated = (sessionsData as any[]).find((s) => s.id === prev.id);
            return (updated as TableSession) || prev;
        });

        setSelectedTable((prev) => {
            if (!prev) return prev;
            const updated = tablesData.find((t) => t.id === prev.id);
            return updated || prev;
        });
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
        <div className="h-full flex flex-col space-y-3 p-1 md:p-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">フロア管理</h1>
                <Button size="icon" onClick={() => setIsNewSessionOpen(true)}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 md:gap-4">
                {sessions.map(session => {
                    const table = tables.find(t => t.id === session.table_id);
                    const castAssignments = (session as any).cast_assignments || [];

                    // ゲストごとにグループ化
                    const guestGroups: { guest: any; servingCasts: any[] }[] = [];
                    const guestIds = new Set<string>();

                    // ゲストを抽出（cast_id === guest_id）
                    castAssignments
                        .filter((a: any) => a.cast_id === a.guest_id)
                        .forEach((a: any) => {
                            if (!guestIds.has(a.guest_id)) {
                                guestIds.add(a.guest_id);
                                // このゲストに接客中のキャストを取得
                                const servingCasts = castAssignments
                                    .filter((c: any) =>
                                        c.guest_id === a.guest_id &&
                                        c.cast_id !== c.guest_id &&
                                        c.status === "serving"
                                    )
                                    .map((c: any) => c.profiles);

                                guestGroups.push({
                                    guest: a.profiles,
                                    servingCasts
                                });
                            }
                        });

                    return (
                        <Card
                            key={session.id}
                            className="cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 p-3 flex flex-col"
                            onClick={() => handleSessionClick(session)}
                        >
                            <CardHeader className="p-0 mb-2 space-y-0">
                                <CardTitle className="text-2xl mb-1 text-slate-900 dark:text-slate-100">{table?.name || "不明"}</CardTitle>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <span className="text-xs sm:text-sm">{formatTime(session.start_time)}〜</span>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">{session.guest_count}名</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 space-y-1.5 flex-1">
                                {/* ゲストと接客中キャストのペア表示 */}
                                {guestGroups.slice(0, 3).map((group, i) => (
                                    <div key={i} className="flex items-center gap-1 text-[11px]">
                                        {/* ゲスト */}
                                        <div className="flex items-center gap-1 min-w-0">
                                            <span className="truncate text-slate-700 dark:text-slate-300">
                                                {group.guest?.display_name || "不明"}
                                            </span>
                                            {/* オンリーバッジ */}
                                            {group.servingCasts.length === 0 && (
                                                <span className="text-[10px] text-red-600 dark:text-red-400 font-medium shrink-0">
                                                    オンリー
                                                </span>
                                            )}
                                        </div>

                                        {group.servingCasts.length > 0 && (
                                            <div className="flex items-center gap-0.5 text-muted-foreground shrink-0">
                                                <span className="text-[10px]">←</span>
                                                {group.servingCasts.slice(0, 2).map((cast: any, j: number) => (
                                                    <span key={j} className="text-pink-600 dark:text-pink-400 truncate max-w-[3rem]">
                                                        {cast?.display_name?.slice(0, 3) || "?"}
                                                    </span>
                                                ))}
                                                {group.servingCasts.length > 2 && (
                                                    <span className="text-muted-foreground">+{group.servingCasts.length - 2}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {guestGroups.length > 3 && (
                                    <div className="text-[10px] text-muted-foreground">
                                        他 {guestGroups.length - 3} 組
                                    </div>
                                )}
                                {guestGroups.length === 0 && (
                                    <div className="text-[10px] text-muted-foreground">
                                        ゲスト未登録
                                    </div>
                                )}

                                {/* クイック注文ボタン */}
                                <div className="pt-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full h-7 text-xs px-2 py-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setQuickOrderSession(session);
                                            setQuickOrderTable(table || null);
                                        }}
                                    >
                                        <Zap className="h-3 w-3 mr-1" />
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

            {
                selectedSession && selectedTable && (
                    <SessionDetailModal
                        isOpen={!!selectedSession}
                        onClose={() => setSelectedSession(null)}
                        session={selectedSession}
                        table={selectedTable}
                        onUpdate={loadData}
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
        </div >
    );
}
