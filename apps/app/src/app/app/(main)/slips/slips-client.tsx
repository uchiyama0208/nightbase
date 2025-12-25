"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, Plus, ChevronLeft } from "lucide-react";
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
import { VercelTabs } from "@/components/ui/vercel-tabs";

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
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const tabs = [
        { key: "active", label: "進行中" },
        { key: "completed", label: "終了済み" },
    ];

    const currentTab = showCompleted ? "completed" : "active";

    const hasFilters = startDate || endDate;

    const getFilterLabel = () => {
        if (startDate && endDate) {
            return `${startDate} ~ ${endDate}`;
        } else if (startDate) {
            return `${startDate} ~`;
        } else if (endDate) {
            return `~ ${endDate}`;
        }
        return "なし";
    };

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

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
        });
    };

    const handleViewDetail = (slip: Slip) => {
        setSelectedSessionId(slip.sessionId);
    };

    const filteredSlips = slips.filter(slip => {
        const slipDate = new Date(slip.startedAt).toISOString().split('T')[0];
        if (startDate && slipDate < startDate) return false;
        if (endDate && slipDate > endDate) return false;
        return true;
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <button
                    type="button"
                    className={`flex items-center gap-1 px-1 py-1 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        hasFilters ? "text-blue-600" : "text-gray-500 dark:text-gray-400"
                    }`}
                    onClick={() => setIsFilterOpen(true)}
                >
                    <Filter className="h-5 w-5 shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        日付: {getFilterLabel()}
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
            <VercelTabs
                tabs={tabs}
                value={currentTab}
                onChange={(val) => setShowCompleted(val === "completed")}
                className="mb-4"
            />

            {/* Slips Table View */}
            <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <Table className="table-fixed">
                    <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                            <TableHead className="w-1/3 text-center text-gray-900 dark:text-gray-100">日付</TableHead>
                            <TableHead className="w-1/3 text-center text-gray-900 dark:text-gray-100">ゲスト</TableHead>
                            <TableHead className="w-1/3 text-center text-gray-900 dark:text-gray-100">合計金額</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSlips.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                    {hasFilters
                                        ? "該当する伝票がありません"
                                        : showCompleted
                                            ? "終了済みの伝票はありません"
                                            : "現在アクティブな伝票はありません"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSlips.map(slip => (
                                <TableRow
                                    key={slip.sessionId}
                                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    onClick={() => handleViewDetail(slip)}
                                >
                                    <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                        {formatDate(slip.startedAt)}
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
                <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 bg-white dark:bg-gray-900">
                        <button
                            type="button"
                            onClick={() => setIsFilterOpen(false)}
                            className="p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-base font-semibold text-gray-900 dark:text-white">
                            フィルター
                        </DialogTitle>
                        <div className="w-7" />
                    </DialogHeader>
                    <div className="flex flex-col gap-4 mt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                開始日
                            </label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                終了日
                            </label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <Button
                            className="w-full rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            onClick={() => setIsFilterOpen(false)}
                        >
                            適用
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setStartDate("");
                                setEndDate("");
                            }}
                            className="w-full rounded-lg"
                        >
                            クリア
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
