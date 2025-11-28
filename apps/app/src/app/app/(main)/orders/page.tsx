"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Minus, ShoppingCart, Clock, Check, X } from "lucide-react";
import { Table, TableSession } from "@/types/floor";
import { getTables } from "../floor-settings/actions";
import { getActiveSessions } from "../floor/actions";

interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: string;
}

interface OrderItem {
    menuItem: MenuItem;
    quantity: number;
}

export default function OrdersPage() {
    const [tables, setTables] = useState<Table[]>([]);
    const [sessions, setSessions] = useState<TableSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<TableSession | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [tablesData, sessionsData] = await Promise.all([
            getTables(),
            getActiveSessions(),
        ]);
        setTables(tablesData);
        setSessions(sessionsData as any);

        // TODO: Load menu items from API
        // For now, using placeholder data
        setMenuItems([
            { id: "1", name: "ビール", price: 800, category: "ドリンク" },
            { id: "2", name: "ハイボール", price: 700, category: "ドリンク" },
            { id: "3", name: "カクテル", price: 900, category: "ドリンク" },
            { id: "4", name: "シャンパン", price: 15000, category: "ボトル" },
            { id: "5", name: "ウイスキー", price: 12000, category: "ボトル" },
            { id: "6", name: "フルーツ盛り合わせ", price: 3000, category: "フード" },
            { id: "7", name: "枝豆", price: 500, category: "フード" },
            { id: "8", name: "ポテトフライ", price: 600, category: "フード" },
        ]);
    };

    const getTableName = (tableId: string) => {
        return tables.find(t => t.id === tableId)?.name || "不明";
    };

    const addToOrder = (menuItem: MenuItem) => {
        setOrderItems(prev => {
            const existing = prev.find(item => item.menuItem.id === menuItem.id);
            if (existing) {
                return prev.map(item =>
                    item.menuItem.id === menuItem.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { menuItem, quantity: 1 }];
        });
    };

    const updateQuantity = (menuItemId: string, delta: number) => {
        setOrderItems(prev => {
            return prev
                .map(item => {
                    if (item.menuItem.id === menuItemId) {
                        const newQuantity = item.quantity + delta;
                        return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
                    }
                    return item;
                })
                .filter((item): item is OrderItem => item !== null);
        });
    };

    const getTotalAmount = () => {
        return orderItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
    };

    const handleSubmitOrder = async () => {
        if (!selectedSession || orderItems.length === 0) return;

        try {
            // TODO: Implement order submission API
            toast({ title: "注文を送信しました" });
            setOrderItems([]);
        } catch (error) {
            toast({ title: "注文の送信に失敗しました" });
        }
    };

    const filteredMenuItems = menuItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupedMenuItems = filteredMenuItems.reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, MenuItem[]>);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Left: Session Selection & Menu */}
            <div className="flex-1 space-y-4">
                {/* Session Selection */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">テーブル選択</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {sessions.map(session => {
                                const table = tables.find(t => t.id === session.table_id);
                                return (
                                    <Button
                                        key={session.id}
                                        variant={selectedSession?.id === session.id ? "default" : "outline"}
                                        onClick={() => setSelectedSession(session)}
                                    >
                                        {table?.name || "不明"}
                                        <Badge variant="secondary" className="ml-2">
                                            {session.guest_count}名
                                        </Badge>
                                    </Button>
                                );
                            })}
                            {sessions.length === 0 && (
                                <p className="text-sm text-muted-foreground">アクティブなセッションがありません</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Menu Items */}
                {selectedSession && (
                    <Card className="flex-1">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">メニュー</CardTitle>
                            <Input
                                placeholder="メニューを検索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="mt-2"
                            />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {Object.entries(groupedMenuItems).map(([category, items]) => (
                                <div key={category}>
                                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">{category}</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {items.map(item => (
                                            <Button
                                                key={item.id}
                                                variant="outline"
                                                className="h-auto py-3 flex flex-col items-start"
                                                onClick={() => addToOrder(item)}
                                            >
                                                <span className="font-medium">{item.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    ¥{item.price.toLocaleString()}
                                                </span>
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Right: Order Summary */}
            <div className="w-full lg:w-80">
                <Card className="sticky top-4">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            注文内容
                        </CardTitle>
                        {selectedSession && (
                            <p className="text-sm text-muted-foreground">
                                {getTableName(selectedSession.table_id)}
                            </p>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {orderItems.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                商品を選択してください
                            </p>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    {orderItems.map(item => (
                                        <div key={item.menuItem.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                                            <div>
                                                <p className="text-sm font-medium">{item.menuItem.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    ¥{item.menuItem.price.toLocaleString()} × {item.quantity}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => updateQuantity(item.menuItem.id, -1)}
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-6 text-center text-sm">{item.quantity}</span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => updateQuantity(item.menuItem.id, 1)}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t pt-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="font-semibold">合計</span>
                                        <span className="text-xl font-bold">
                                            ¥{getTotalAmount().toLocaleString()}
                                        </span>
                                    </div>
                                    <Button
                                        className="w-full"
                                        onClick={handleSubmitOrder}
                                        disabled={!selectedSession}
                                    >
                                        <Check className="h-4 w-4 mr-2" />
                                        注文を確定
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
