"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Clock, Plus } from "lucide-react";
import { Table as FloorTable, TableSession } from "@/types/floor";
import { getTables } from "../seats/actions";
import { getActiveSessions } from "../floor/actions";
import { NewSessionModal } from "../floor/new-session-modal";
import { SlipDetailModal } from "@/components/slips/slip-detail-modal";

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

            return {
                sessionId: session.id,
                tableId: session.table_id,
                tableName: table?.name || "不明",
                guestCount: session.guest_count,
                startedAt: session.start_time,
                orders,
                subtotal,
                tax,
                serviceCharge,
                total: subtotal + tax + serviceCharge,
                status: "open" as const,
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
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">伝票</h1>
                <div className="flex items-center gap-2">
                    <div className="relative w-48">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="テーブルを検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button onClick={() => setIsNewSessionOpen(true)} size="icon">
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Active Slips */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredSlips.map(slip => (
                    <Card
                        key={slip.sessionId}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleViewDetail(slip)}
                    >
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg">{slip.tableName}</CardTitle>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTime(slip.startedAt)} ({calculateDuration(slip.startedAt)})
                                    </div>
                                </div>
                                <Badge variant={slip.status === "open" ? "default" : "secondary"}>
                                    {slip.status === "open" ? "営業中" : "精算済"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">人数</span>
                                <span>{slip.guestCount}名</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">合計</span>
                                <span className="text-xl font-bold">¥{slip.total.toLocaleString()}</span>
                            </div>

                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredSlips.length === 0 && (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        {searchQuery ? "該当する伝票がありません" : "現在アクティブな伝票はありません"}
                    </CardContent>
                </Card>
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
                onSessionCreated={loadData}
            />
                    </div>
    );
}
