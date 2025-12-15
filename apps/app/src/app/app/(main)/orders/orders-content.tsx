"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { RefreshCw, Volume2, VolumeX, Bell, Check, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderWithDetails, TableCall, updateOrderStatus, getAllOrders, getTableCalls, resolveTableCall } from "./actions";
import { useToast } from "@/components/ui/use-toast";
import { formatJSTTime } from "@/lib/utils";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";

interface OrdersContentProps {
    initialOrders: OrderWithDetails[];
    initialTableCalls: TableCall[];
    storeId: string;
}

type TabType = "pending" | "completed";

// 通知音を生成するユーティリティ（注文用）
function playOrderNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // 2音のチャイム音を生成
        const playTone = (frequency: number, startTime: number, duration: number) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = "sine";

            gainNode.gain.setValueAtTime(0.3, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };

        const now = audioContext.currentTime;
        playTone(880, now, 0.15);         // A5
        playTone(1108.73, now + 0.15, 0.2); // C#6

    } catch (e) {
        console.error("Audio playback failed:", e);
    }
}

// 呼び出し用の通知音（より目立つ音）
function playCallNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        const playTone = (frequency: number, startTime: number, duration: number) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = "square";

            gainNode.gain.setValueAtTime(0.2, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };

        const now = audioContext.currentTime;
        // 3回繰り返す緊急音
        playTone(1000, now, 0.1);
        playTone(800, now + 0.15, 0.1);
        playTone(1000, now + 0.3, 0.1);
        playTone(800, now + 0.45, 0.1);
        playTone(1000, now + 0.6, 0.15);

    } catch (e) {
        console.error("Audio playback failed:", e);
    }
}

export function OrdersContent({ initialOrders, initialTableCalls, storeId }: OrdersContentProps) {
    const [orders, setOrders] = useState(initialOrders);
    const [tableCalls, setTableCalls] = useState(initialTableCalls);
    const [currentTab, setCurrentTab] = useState<TabType>("pending");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const { toast } = useToast();

    // 前回の注文IDを記憶して新規注文を検知
    const prevOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map(o => o.id)));
    const prevCallIdsRef = useRef<Set<string>>(new Set(initialTableCalls.map(c => c.id)));

    // Vercel-style tabs with animated underline
    const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    const tabs: { key: TabType; label: string }[] = [
        { key: "pending", label: "未完了" },
        { key: "completed", label: "完了" },
    ];

    useEffect(() => {
        const activeButton = tabsRef.current[currentTab];
        if (activeButton) {
            setIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
            });
        }
    }, [currentTab]);

    // 注文データを取得し、新規注文があれば通知
    const fetchOrders = useCallback(async (playSound: boolean = true) => {
        try {
            const newOrders = await getAllOrders();

            // 新規注文を検出
            if (playSound && soundEnabled) {
                const newOrderIds = new Set(newOrders.map(o => o.id));
                const hasNewOrder = newOrders.some(o => !prevOrderIdsRef.current.has(o.id));

                if (hasNewOrder) {
                    playOrderNotificationSound();
                    toast({ title: "新しい注文が入りました" });
                }

                prevOrderIdsRef.current = newOrderIds;
            }

            setOrders(newOrders);
        } catch (e) {
            console.error("Error fetching orders:", e);
        }
    }, [soundEnabled, toast]);

    // 呼び出しデータを取得
    const fetchTableCalls = useCallback(async (playSound: boolean = true) => {
        try {
            const newCalls = await getTableCalls();

            // 新規呼び出しを検出
            if (playSound && soundEnabled) {
                const newCallIds = new Set(newCalls.map(c => c.id));
                const hasNewCall = newCalls.some(c => !prevCallIdsRef.current.has(c.id));

                if (hasNewCall) {
                    playCallNotificationSound();
                    toast({ title: "呼び出しがあります" });
                }

                prevCallIdsRef.current = newCallIds;
            }

            setTableCalls(newCalls);
        } catch (e) {
            console.error("Error fetching table calls:", e);
        }
    }, [soundEnabled, toast]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                fetchOrders(false),
                fetchTableCalls(false),
            ]);
        } catch {
            toast({ title: "更新に失敗しました" });
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        const result = await updateOrderStatus(orderId, newStatus);
        if (result.success) {
            setOrders(prev =>
                prev.map(order =>
                    order.id === orderId ? { ...order, status: newStatus } : order
                )
            );
        } else {
            toast({ title: result.error || "エラーが発生しました" });
        }
    };

    const handleResolveCall = async (callId: string) => {
        const result = await resolveTableCall(callId);
        if (result.success) {
            setTableCalls(prev => prev.filter(c => c.id !== callId));
        } else {
            toast({ title: result.error || "エラーが発生しました" });
        }
    };

    // Supabase Realtime subscription
    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const ordersChannel = supabase
            .channel("orders_changes")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "orders",
                },
                () => {
                    fetchOrders(true);
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "orders",
                },
                () => {
                    fetchOrders(false);
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "orders",
                },
                () => {
                    fetchOrders(false);
                }
            )
            .subscribe();

        const callsChannel = supabase
            .channel("table_calls_changes")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "table_calls",
                },
                () => {
                    fetchTableCalls(true);
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "table_calls",
                },
                () => {
                    fetchTableCalls(false);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(ordersChannel);
            supabase.removeChannel(callsChannel);
        };
    }, [fetchOrders, fetchTableCalls]);

    const pendingOrders = orders.filter(o => o.status !== "completed" && o.status !== "cancelled");
    const completedOrders = orders.filter(o => o.status === "completed");
    const filteredOrders = currentTab === "pending" ? pendingOrders : completedOrders;

    const pendingCount = pendingOrders.length;

    return (
        <div className="space-y-4">
            {/* Header buttons */}
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    title={soundEnabled ? "通知音オフ" : "通知音オン"}
                >
                    {soundEnabled ? (
                        <Volume2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    ) : (
                        <VolumeX className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    )}
                </Button>
                <div className="flex-1" />
                <Link href="/app/settings/qr-order">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        title="QRコード設定"
                    >
                        <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </Button>
                </Link>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                >
                    <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
            </div>

            {/* Table Calls Banner */}
            {tableCalls.length > 0 && (
                <div className="space-y-2">
                    {tableCalls.map(call => (
                        <div
                            key={call.id}
                            className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl animate-pulse"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-full">
                                    <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <span className="font-medium text-amber-900 dark:text-amber-100">
                                        {call.table?.name || "不明な卓"} から呼び出し
                                    </span>
                                    <p className="text-xs text-amber-600 dark:text-amber-400">
                                        {formatJSTTime(call.created_at)}
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                className="rounded-full bg-amber-600 hover:bg-amber-700 text-white"
                                onClick={() => handleResolveCall(call.id)}
                            >
                                <Check className="h-4 w-4 mr-1" />
                                対応済み
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Vercel-style Tab Navigation */}
            <div className="relative">
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            ref={(el) => { tabsRef.current[tab.key] = el; }}
                            type="button"
                            onClick={() => setCurrentTab(tab.key)}
                            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                                currentTab === tab.key
                                    ? "text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            }`}
                        >
                            {tab.label}
                            {tab.key === "pending" && pendingCount > 0 && (
                                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs font-medium">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <span
                    className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-300 ease-out"
                    style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                />
            </div>

            {/* Content */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed">
                    {currentTab === "pending" ? "未完了の注文はありません" : "完了した注文はありません"}
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredOrders.map(order => (
                            <div
                                key={order.id}
                                className="flex items-center justify-between px-4 py-3"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {order.menu?.name || order.item_name || "不明なアイテム"}
                                        </span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            ×{order.quantity}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {order.table_session?.table?.name || "卓なし"}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatJSTTime(order.created_at)}
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    variant={currentTab === "completed" ? "outline" : "default"}
                                    size="sm"
                                    className={
                                        currentTab === "completed"
                                            ? "rounded-full"
                                            : "rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                                    }
                                    onClick={() =>
                                        handleStatusChange(
                                            order.id,
                                            currentTab === "completed" ? "pending" : "completed"
                                        )
                                    }
                                >
                                    {currentTab === "completed" ? "戻す" : "完了"}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
