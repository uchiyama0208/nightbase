"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Filter, Clock, Plus, X } from "lucide-react";
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
import { Table as FloorTable, TableSession } from "@/types/floor";
import { getTables } from "../seats/actions";
import { getActiveSessionsV2, getCompletedSessionsV2 } from "../floor/actions/session";
import { NewSessionModal } from "../floor/new-session-modal";
import { SlipDetailModal } from "@/components/slips/slip-detail-modal";
import { createBrowserClient } from "@supabase/ssr";

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

export function SlipsClient() {
    const [tables, setTables] = useState<FloorTable[]>([]);
    const [sessions, setSessions] = useState<TableSession[]>([]);
    const [slips, setSlips] = useState<Slip[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Vercel-style tabs with animated underline
    const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    const tabs = [
        { key: "active", label: "進行中" },
        { key: "completed", label: "終了済み" },
    ];

    const currentTab = showCompleted ? "completed" : "active";

    useEffect(() => {
        const activeButton = tabsRef.current[currentTab];
        if (activeButton) {
            setIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
            });
        }
    }, [currentTab]);

    const activeFilters = [searchQuery.trim() && "テーブル"]
        .filter(Boolean)
        .map(String);
    const hasFilters = activeFilters.length > 0;

    useEffect(() => {
        loadData();
    }, [showCompleted]);

    // Supabase Realtime subscription
    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const channel = supabase
            .channel("table_sessions_changes")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "table_sessions",
                },
                () => {
                    loadData();
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "orders",
                },
                () => {
                    loadData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [showCompleted]);

    const loadData = async () => {
        const [tablesData, sessionsData] = await Promise.all([
            getTables(),
            showCompleted ? getCompletedSessionsV2() : getActiveSessionsV2(),
        ]);
        setTables(tablesData);
        setSessions(sessionsData as any);

        // Generate slips from sessions with actual order data (V2 structure)
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

            // V2: ゲスト情報を session_guests から取得
            const sessionGuests = session.session_guests || [];
            const guestName = sessionGuests
                .map((sg: any) => sg.profiles?.display_name)
                .filter(Boolean)
                .join("、") || "不明";

            // V2: キャスト情報を orders から取得（指名料・場内料金）
            const castOrders = (session.orders || []).filter((o: any) =>
                o.item_name === '指名料' || o.item_name === '場内料金' || o.item_name === '同伴料'
            );
            const casts = castOrders.map((o: any) => ({
                name: o.profiles?.display_name || "不明",
                type: o.item_name === '指名料' ? '指名' : (o.item_name === '同伴料' ? '同伴' : '場内指名')
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
                        フィルター: {hasFilters ? searchQuery : "なし"}
                    </span>
                </button>
                <div className="flex-1" />
                <Button
                    size="icon"
                    className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                    onClick={() => setIsNewSessionOpen(true)}
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </div>

            {/* Vercel-style Tab Navigation */}
            <div className="relative mb-4">
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            ref={(el) => { tabsRef.current[tab.key] = el; }}
                            type="button"
                            onClick={() => setShowCompleted(tab.key === "completed")}
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

            {/* Completed Slips - Table View */}
            {showCompleted ? (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
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
                    <div className="grid grid-cols-2 gap-3">
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
                                テーブルで検索
                            </label>
                            <div className="relative">
                                <Input
                                    placeholder="テーブル名を入力..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 pr-9 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <Button
                            className="w-full rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            onClick={() => setIsFilterOpen(false)}
                        >
                            適用
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
