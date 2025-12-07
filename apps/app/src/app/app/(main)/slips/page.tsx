"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Clock, Plus } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Table as FloorTable, TableSession } from "@/types/floor";
import { getTables } from "../seats/actions";
import { getActiveSessions, getCompletedSessions } from "../floor/actions";
import { NewSessionModal } from "../floor/new-session-modal";
import { SlipDetailModal } from "@/components/slips/slip-detail-modal";
import { PageTitle } from "@/components/page-title";

interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    castName?: string;
}

interface Slip {
    sessionId: string;
    tableId: string;
    tableName: string;
    guestCount: number;
    startedAt: string;
    endedAt: string | null;
    guestName: string;
    casts: { name: string; type: string }[];
    orders: OrderItem[];
    subtotal: number;
    tax: number;
    serviceCharge: number;
    total: number;
    status: "open" | "closed";
    pricingSystemId: string | null;
}

export default function SlipsPage() {
    const [tables, setTables] = useState<FloorTable[]>([]);
    const [sessions, setSessions] = useState<TableSession[]>([]);
    const [slips, setSlips] = useState<Slip[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);

    const toggleIndex = showCompleted ? 1 : 0;
    const activeFilters = [searchQuery.trim() && "テーブル"]
        .filter(Boolean)
        .map(String);
    const hasFilters = activeFilters.length > 0;

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [showCompleted]);

    const loadData = async () => {
        const [tablesData, sessionsData] = await Promise.all([
            getTables(),
            showCompleted ? getCompletedSessions() : getActiveSessions(),
        ]);
        setTables(tablesData);
        setSessions(sessionsData as any);

        // Generate slips from sessions with actual order data
        const generatedSlips: Slip[] = sessionsData.map((session: any) => {
            const table = tablesData.find((t: FloorTable) => t.id === session.table_id);

            // Use actual orders from session, or empty array if none
            const orders: OrderItem[] = (session.orders || []).map((order: any) => ({
                id: order.id,
                name: order.item_name || order.menus?.name || order.menu?.name || "不明",
                price: order.amount || 0,
                quantity: order.quantity || 1,
                castName: order.profiles?.display_name,
            }));

            const subtotal = orders.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const tax = Math.floor(subtotal * 0.1);
            const serviceCharge = Math.floor(subtotal * 0.2);

            // Extract guest and cast information from cast_assignments
            const assignments = session.cast_assignments || [];

            // ゲスト情報を取得（guest_idとcast_idが同じassignment）
            const guestAssignments = assignments.filter((a: any) => a.guest_id === a.cast_id);
            const guestName = guestAssignments.map((a: any) => a.profiles?.display_name || a.guest_profile?.display_name).filter(Boolean).join("、") || "不明";

            // キャスト情報を取得（指名・場内指名）
            const castAssignments = assignments.filter((a: any) =>
                a.guest_id !== a.cast_id && ['shimei', 'jonai'].includes(a.status)
            );
            const casts = castAssignments.map((a: any) => ({
                name: a.profiles?.display_name || "不明",
                type: a.status === 'shimei' ? '指名' : '場内指名'
            }));

            return {
                sessionId: session.id,
                tableId: session.table_id,
                tableName: table?.name || "不明",
                guestCount: session.guest_count,
                startedAt: session.start_time,
                endedAt: session.end_time,
                guestName,
                casts: casts || [],
                orders,
                subtotal,
                tax,
                serviceCharge,
                total: subtotal + tax + serviceCharge,
                status: session.status === "completed" ? "closed" as const : "open" as const,
                pricingSystemId: session.pricing_system_id,
            };
        });

        setSlips(generatedSlips);
    };

    const formatTime = (dateString: string) => {
        if (!dateString) return "--:--";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "--:--";
        return date.toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Tokyo",
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
        });
    };

    const calculateDuration = (startedAt: string) => {
        if (!startedAt) return "--時間--分";
        const start = new Date(startedAt);
        if (isNaN(start.getTime())) return "--時間--分";
        const now = new Date();
        const diffMs = now.getTime() - start.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}時間${minutes}分`;
    };

    const handleViewDetail = (slip: Slip) => {
        setSelectedSessionId(slip.sessionId);
    };

    const filteredSlips = slips.filter(slip =>
        slip.tableName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <PageTitle
                title="伝票"
                description="進行中および終了済みの伝票を管理します。"
                backTab="floor"
            />
            <div className="flex items-center justify-between">
                <div className="relative inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
                    <div
                        className="absolute h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-transform duration-300 ease-in-out"
                        style={{
                            width: "96px",
                            left: "4px",
                            transform: `translateX(calc(${toggleIndex} * (96px + 0px)))`
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => setShowCompleted(false)}
                        className={`relative z-10 w-24 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${!showCompleted
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            }`}
                    >
                        進行中
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowCompleted(true)}
                        className={`relative z-10 w-24 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${showCompleted
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            }`}
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

            <Accordion type="single" collapsible className="w-full">
                <AccordionItem
                    value="filters"
                    className="rounded-2xl border border-gray-200 bg-white px-2 dark:border-gray-700 dark:bg-gray-800"
                >
                    <AccordionTrigger className="px-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <div className="flex w-full items-center justify-between pr-2">
                            <span>フィルター</span>
                            {hasFilters && (
                                <span className="text-xs text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                                    {activeFilters.join("・")}
                                </span>
                            )}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-2">
                        <div className="flex flex-col gap-3 pt-2 pb-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="テーブルを検索..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-9 text-xs md:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            {/* Completed Slips - Table View */}
            {showCompleted ? (
                <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                                <TableHead className="w-1/5 text-center text-gray-900 dark:text-gray-100">日付</TableHead>
                                <TableHead className="w-1/5 text-center text-gray-900 dark:text-gray-100">入店</TableHead>
                                <TableHead className="w-1/5 text-center text-gray-900 dark:text-gray-100">退店</TableHead>
                                <TableHead className="w-1/5 text-center text-gray-900 dark:text-gray-100">ゲスト</TableHead>
                                <TableHead className="w-1/5 text-center text-gray-900 dark:text-gray-100">合計金額</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSlips.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        {searchQuery ? "該当する伝票がありません" : "終了済みの伝票はありません"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredSlips.map(slip => (
                                    <TableRow
                                        key={slip.sessionId}
                                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                        onClick={() => handleViewDetail(slip)}
                                    >
                                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                            {formatDate(slip.startedAt)}
                                        </TableCell>
                                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                            {formatTime(slip.startedAt)}
                                        </TableCell>
                                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                            {slip.endedAt ? formatTime(slip.endedAt) : "--:--"}
                                        </TableCell>
                                        <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                            {slip.guestName}
                                        </TableCell>
                                        <TableCell className="text-center font-medium text-gray-900 dark:text-gray-100">
                                            ¥{slip.total.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                /* Active Slips - Card View */
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredSlips.map(slip => (
                            <Card
                                key={slip.sessionId}
                                className="hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => handleViewDetail(slip)}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg text-gray-900 dark:text-white">{slip.tableName}</CardTitle>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {formatDate(slip.startedAt)}
                                            </div>
                                        </div>
                                        <Badge variant={slip.status === "open" ? "default" : "secondary"}>
                                            {slip.status === "open" ? "営業中" : "精算済"}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100">
                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-muted-foreground">入店:</span>
                                            <span className="text-gray-900 dark:text-gray-100">{formatTime(slip.startedAt)}</span>
                                        </div>
                                        {slip.endedAt && (
                                            <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100">
                                                <Clock className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-muted-foreground">退店:</span>
                                                <span className="text-gray-900 dark:text-gray-100">{formatTime(slip.endedAt)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-sm text-gray-900 dark:text-gray-100">
                                        <span className="text-muted-foreground">ゲスト: </span>
                                        <span className="text-gray-900 dark:text-gray-100">{slip.guestName}</span>
                                    </div>

                                    {slip.casts && slip.casts.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {slip.casts.map((cast, idx) => (
                                                <span key={idx} className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-md">
                                                    {cast.type}: {cast.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center pt-2 border-t">
                                        <span className="text-muted-foreground">合計</span>
                                        <span className="text-xl font-bold text-gray-900 dark:text-white">¥{slip.total.toLocaleString()}</span>
                                    </div>

                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {filteredSlips.length === 0 && (
                        <Card>
                            <CardContent className="py-8 text-center text-muted-foreground">
                                {searchQuery
                                    ? "該当する伝票がありません"
                                    : "現在アクティブな伝票はありません"}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* Slip Detail Modal */}
            <SlipDetailModal
                isOpen={!!selectedSessionId}
                onClose={() => setSelectedSessionId(null)}
                sessionId={selectedSessionId}
                onUpdate={loadData}
                editable={true}
            />

            {/* New Session Modal */}
            <NewSessionModal
                isOpen={isNewSessionOpen}
                onClose={() => setIsNewSessionOpen(false)}
                tables={tables.filter(t => !sessions.some(s => s.table_id === t.id))}
                onSessionCreated={async (sessionId) => {
                    await loadData();
                    if (sessionId) {
                        setSelectedSessionId(sessionId);
                    }
                }}
            />
        </div>
    );
}
