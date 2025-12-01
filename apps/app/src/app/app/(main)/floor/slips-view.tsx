"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table as UITable,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Receipt, Search, Printer, CreditCard, Banknote, Clock, CheckCircle } from "lucide-react";
import { Table as FloorTable, TableSession } from "@/types/floor";
import { getTables } from "../seats/actions";
import { getActiveSessions, closeSession } from "../floor/actions";

interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
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
}

export function SlipsView() {
    const [tables, setTables] = useState<FloorTable[]>([]);
    const [sessions, setSessions] = useState<TableSession[]>([]);
    const [slips, setSlips] = useState<Slip[]>([]);
    const [selectedSlip, setSelectedSlip] = useState<Slip | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const { toast } = useToast();

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

        // Generate slips from sessions
        // TODO: Load actual order data from API
        const generatedSlips: Slip[] = sessionsData.map((session: any) => {
            const table = tablesData.find((t: FloorTable) => t.id === session.table_id);
            // Placeholder orders for demo
            const orders: OrderItem[] = [
                { id: "1", name: "セット料金", price: 5000, quantity: session.guest_count },
                { id: "2", name: "ドリンク", price: 800, quantity: 3 },
            ];
            const subtotal = orders.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const tax = Math.floor(subtotal * 0.1);
            const serviceCharge = Math.floor(subtotal * 0.2);

            return {
                sessionId: session.id,
                tableId: session.table_id,
                tableName: table?.name || "不明",
                guestCount: session.guest_count,
                startedAt: session.started_at,
                orders,
                subtotal,
                tax,
                serviceCharge,
                total: subtotal + tax + serviceCharge,
                status: "open" as const,
            };
        });

        setSlips(generatedSlips);
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString("ja-JP", {
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
        const start = new Date(startedAt);
        const now = new Date();
        const diffMs = now.getTime() - start.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}時間${minutes}分`;
    };

    const handleViewDetail = (slip: Slip) => {
        setSelectedSlip(slip);
        setIsDetailOpen(true);
    };

    const handlePayment = (slip: Slip) => {
        setSelectedSlip(slip);
        setIsPaymentOpen(true);
    };

    const handleCloseSession = async (paymentMethod: "cash" | "card") => {
        if (!selectedSlip) return;

        try {
            await closeSession(selectedSlip.sessionId);
            await loadData();
            setIsPaymentOpen(false);
            setIsDetailOpen(false);
            toast({
                title: "会計が完了しました",
                description: `${paymentMethod === "cash" ? "現金" : "カード"}で¥${selectedSlip.total.toLocaleString()}を精算しました`,
            });
        } catch (error) {
            toast({ title: "会計処理に失敗しました" });
        }
    };

    const filteredSlips = slips.filter(slip =>
        slip.tableName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">伝票</h1>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="テーブルを検索..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
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

            {/* Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5" />
                            {selectedSlip?.tableName} - 伝票詳細
                        </DialogTitle>
                    </DialogHeader>
                    {selectedSlip && (
                        <div className="space-y-4">
                            <div className="text-sm text-muted-foreground">
                                {formatDate(selectedSlip.startedAt)} {formatTime(selectedSlip.startedAt)}〜
                                <span className="ml-2">({calculateDuration(selectedSlip.startedAt)})</span>
                            </div>

                            <UITable>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>商品</TableHead>
                                        <TableHead className="text-right">数量</TableHead>
                                        <TableHead className="text-right">金額</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedSlip.orders.map(order => (
                                        <TableRow key={order.id}>
                                            <TableCell>{order.name}</TableCell>
                                            <TableCell className="text-right">{order.quantity}</TableCell>
                                            <TableCell className="text-right">
                                                ¥{(order.price * order.quantity).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </UITable>

                            <div className="border-t pt-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>小計</span>
                                    <span>¥{selectedSlip.subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>サービス料 (20%)</span>
                                    <span>¥{selectedSlip.serviceCharge.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>消費税 (10%)</span>
                                    <span>¥{selectedSlip.tax.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg border-t pt-2">
                                    <span>合計</span>
                                    <span>¥{selectedSlip.total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                            閉じる
                        </Button>
                        <Button onClick={() => window.print()}>
                            <Printer className="h-4 w-4 mr-2" />
                            印刷
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment Dialog */}
            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>会計処理</DialogTitle>
                    </DialogHeader>
                    {selectedSlip && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">{selectedSlip.tableName}</p>
                                <p className="text-3xl font-bold mt-2">¥{selectedSlip.total.toLocaleString()}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Button
                                    variant="outline"
                                    className="h-24 flex flex-col gap-2"
                                    onClick={() => handleCloseSession("cash")}
                                >
                                    <Banknote className="h-8 w-8" />
                                    <span>現金</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-24 flex flex-col gap-2"
                                    onClick={() => handleCloseSession("card")}
                                >
                                    <CreditCard className="h-8 w-8" />
                                    <span>カード</span>
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
