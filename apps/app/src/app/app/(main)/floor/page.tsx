"use client";

import { useState, useEffect } from "react";
import { Table, TableSession } from "@/types/floor";
import { getTables } from "../floor-settings/actions";
import { getActiveSessions } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSession } from "./actions";
import { useToast } from "@/components/ui/use-toast";

import { WaitingCastSidebar } from "./waiting-cast-sidebar";
import { InfoPanel } from "./info-panel";
import { ConnectionLayer } from "./connection-layer";
import { assignCast } from "./actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function FloorPage() {
    const [tables, setTables] = useState<Table[]>([]);
    const [sessions, setSessions] = useState<TableSession[]>([]);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [selectedSession, setSelectedSession] = useState<TableSession | null>(null);
    const [isCheckInOpen, setIsCheckInOpen] = useState(false);
    const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
    const [guestCount, setGuestCount] = useState(1);
    const { toast } = useToast();

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        const [tablesData, sessionsData] = await Promise.all([
            getTables(),
            getActiveSessions()
        ]);
        setTables(tablesData);
        setSessions(sessionsData as any);
    };

    const handleTableClick = (table: Table) => {
        const session = sessions.find(s => s.table_id === table.id);
        if (session) {
            setSelectedTable(table);
            setSelectedSession(session);
            setIsInfoPanelOpen(true);
        } else {
            setSelectedTable(table);
            setIsCheckInOpen(true);
        }
    };

    const handleCheckIn = async () => {
        if (!selectedTable) return;

        try {
            await createSession(selectedTable.id, guestCount);
            setIsCheckInOpen(false);
            loadData();
            toast({ title: "入店処理が完了しました" });
        } catch (error) {
            toast({ title: "エラーが発生しました", variant: "destructive" });
        }
    };

    const handleDragStart = (e: React.DragEvent, cast: any) => {
        e.dataTransfer.setData("castId", cast.id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, tableId: string) => {
        e.preventDefault();
        const castId = e.dataTransfer.getData("castId");
        const session = sessions.find(s => s.table_id === tableId);

        if (session && castId) {
            try {
                await assignCast(session.id, castId, 'free'); // Default to free
                loadData();
                toast({ title: "キャストを配置しました" });
            } catch (error) {
                toast({ title: "配置に失敗しました", variant: "destructive" });
            }
        }
    };

    return (
        <div className="flex h-full">
            {/* Sidebar */}
            <WaitingCastSidebar onDragStart={handleDragStart} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                <div className="p-4 border-b bg-background z-10 flex justify-between items-center">
                    <h1 className="text-xl font-bold">フロア管理</h1>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-1 text-xs">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div> フリー
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                            <div className="w-2 h-2 rounded-full bg-pink-500"></div> 指名
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
                    <ConnectionLayer tables={tables} sessions={sessions} />

                    {tables.map(table => {
                        const session = sessions.find(s => s.table_id === table.id);
                        return (
                            <div
                                key={table.id}
                                className={`absolute flex flex-col items-center justify-center border-2 transition-all cursor-pointer shadow-sm z-20 ${session
                                        ? "border-blue-500 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                        : "border-slate-300 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                                    }`}
                                style={{
                                    left: table.x,
                                    top: table.y,
                                    width: table.width,
                                    height: table.height,
                                    borderRadius: table.shape === 'circle' ? '50%' : '8px',
                                    transform: `rotate(${table.rotation || 0}deg)`
                                }}
                                onClick={() => handleTableClick(table)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, table.id)}
                            >
                                <span className="font-bold text-lg">{table.name}</span>
                                {session && (
                                    <div className="text-xs mt-1 font-medium">
                                        {session.guest_count}名
                                    </div>
                                )}

                                {/* Render assigned casts around the table */}
                                {session && (session as any).cast_assignments?.map((assignment: any, index: number) => {
                                    const totalAssignments = (session as any).cast_assignments.length;
                                    const angle = (index / totalAssignments) * Math.PI * 2;
                                    // Position relative to table center, but we are inside the table div
                                    // So we need to position absolutely relative to the table center
                                    const radius = Math.max(table.width, table.height) * 0.6 + 20;
                                    const x = Math.cos(angle) * radius;
                                    const y = Math.sin(angle) * radius;

                                    return (
                                        <div
                                            key={assignment.id}
                                            className="absolute w-8 h-8 rounded-full border-2 bg-background z-30"
                                            style={{
                                                transform: `translate(${x}px, ${y}px)`,
                                                borderColor: assignment.status === 'shime' ? '#ec4899' : '#3b82f6'
                                            }}
                                            title={assignment.profiles?.display_name}
                                        >
                                            <Avatar className="w-full h-full">
                                                <AvatarImage src={assignment.profiles?.avatar_url} />
                                                <AvatarFallback className="text-[10px]">
                                                    {assignment.profiles?.display_name?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Info Panel */}
            {isInfoPanelOpen && (
                <InfoPanel
                    selectedTable={selectedTable}
                    session={selectedSession}
                    onClose={() => setIsInfoPanelOpen(false)}
                />
            )}

            <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedTable?.name} - 入店処理</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>人数</Label>
                            <Input
                                type="number"
                                min="1"
                                value={guestCount}
                                onChange={(e) => setGuestCount(parseInt(e.target.value))}
                            />
                        </div>
                        <Button className="w-full" onClick={handleCheckIn}>
                            入店開始
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
