"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, ShoppingCart, Minus, Plus, X, Clock, Check, Loader2, History } from "lucide-react";
import { MenuItem, MenuCategory, StoreInfo, TableInfo, ActiveSession, createOrders, createTableCall, getSessionOrders } from "./actions";
import { useToast } from "@/components/ui/use-toast";
import { createBrowserClient } from "@supabase/ssr";
import { formatJSTTime } from "@/lib/utils";

interface OrderPageContentProps {
    store: StoreInfo;
    table: TableInfo;
    session: ActiveSession | null;
    categories: MenuCategory[];
    menus: MenuItem[];
}

interface CartItem {
    menu: MenuItem;
    quantity: number;
}

interface OrderHistoryItem {
    id: string;
    item_name: string;
    quantity: number;
    amount: number;
    status: string;
    created_at: string;
}

export function OrderPageContent({ store, table, session: initialSession, categories, menus }: OrderPageContentProps) {
    const [session, setSession] = useState<ActiveSession | null>(initialSession);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(
        categories.length > 0 ? categories[0].id : null
    );
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCalling, setIsCalling] = useState(false);
    const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const { toast } = useToast();

    // カテゴリ別にメニューをフィルタリング
    const filteredMenus = selectedCategory
        ? menus.filter(menu => menu.category_id === selectedCategory)
        : menus;

    // カートの合計金額
    const cartTotal = cart.reduce((sum, item) => sum + item.menu.price * item.quantity, 0);
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // カートに追加
    const addToCart = (menu: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(item => item.menu.id === menu.id);
            if (existing) {
                return prev.map(item =>
                    item.menu.id === menu.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { menu, quantity: 1 }];
        });
    };

    // カートから削除
    const removeFromCart = (menuId: string) => {
        setCart(prev => {
            const existing = prev.find(item => item.menu.id === menuId);
            if (existing && existing.quantity > 1) {
                return prev.map(item =>
                    item.menu.id === menuId
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                );
            }
            return prev.filter(item => item.menu.id !== menuId);
        });
    };

    // カートのアイテム数を取得
    const getCartQuantity = (menuId: string): number => {
        return cart.find(item => item.menu.id === menuId)?.quantity || 0;
    };

    // 注文を送信
    const submitOrder = async () => {
        if (!session || cart.length === 0) return;

        setIsSubmitting(true);
        try {
            const items = cart.map(item => ({
                menuId: item.menu.id,
                itemName: item.menu.name,
                quantity: item.quantity,
                amount: item.menu.price * item.quantity,
            }));

            const result = await createOrders(session.id, items);

            if (result.success) {
                toast({ title: "注文を送信しました" });
                setCart([]);
                setIsCartOpen(false);
            } else {
                toast({ title: result.error || "注文に失敗しました" });
            }
        } catch {
            toast({ title: "注文に失敗しました" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // スタッフを呼ぶ
    const callStaff = async () => {
        setIsCalling(true);
        try {
            const result = await createTableCall(store.id, table.id, session?.id || null);

            if (result.success) {
                toast({ title: "スタッフを呼びました" });
            } else {
                toast({ title: result.error || "呼び出しに失敗しました" });
            }
        } catch {
            toast({ title: "呼び出しに失敗しました" });
        } finally {
            setIsCalling(false);
        }
    };

    // 注文履歴を取得
    const fetchOrderHistory = useCallback(async () => {
        if (!session) return;
        setIsLoadingHistory(true);
        try {
            const orders = await getSessionOrders(session.id);
            setOrderHistory(orders);
        } catch {
            console.error("Error fetching order history");
        } finally {
            setIsLoadingHistory(false);
        }
    }, [session]);

    // 履歴モーダルを開く
    const openHistory = () => {
        setIsHistoryOpen(true);
        fetchOrderHistory();
    };

    // Realtime subscription for session changes
    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const channel = supabase
            .channel("session_changes")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "table_sessions",
                    filter: `table_id=eq.${table.id}`,
                },
                (payload) => {
                    if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
                        const newSession = payload.new as ActiveSession;
                        if (newSession.status === "active") {
                            setSession(newSession);
                        } else if (newSession.id === session?.id) {
                            setSession(null);
                        }
                    } else if (payload.eventType === "DELETE" && payload.old) {
                        const oldSession = payload.old as ActiveSession;
                        if (oldSession.id === session?.id) {
                            setSession(null);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [table.id, session?.id]);

    // Realtime subscription for order status updates
    useEffect(() => {
        if (!session || !isHistoryOpen) return;

        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const channel = supabase
            .channel("order_updates")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "orders",
                    filter: `table_session_id=eq.${session.id}`,
                },
                () => {
                    fetchOrderHistory();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session, isHistoryOpen, fetchOrderHistory]);

    // セッションがない場合
    if (!session) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="text-center space-y-4 max-w-md">
                    <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <X className="h-8 w-8 text-gray-400" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        注文を受け付けていません
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        現在、この卓は利用中ではありません。<br />
                        スタッフにお声がけください。
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                        {store.name} - {table.name}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-bold text-gray-900 dark:text-white">{store.name}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{table.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={openHistory}
                        >
                            <History className="h-4 w-4 mr-1" />
                            履歴
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={callStaff}
                            disabled={isCalling}
                        >
                            {isCalling ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Bell className="h-4 w-4 mr-1" />
                                    呼ぶ
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Category tabs */}
            <div className="sticky top-[61px] z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                <div className="flex px-2 py-2 gap-2 min-w-max">
                    {categories.map(category => (
                        <button
                            key={category.id}
                            type="button"
                            onClick={() => setSelectedCategory(category.id)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                selectedCategory === category.id
                                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu grid */}
            <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredMenus.map(menu => {
                        const quantity = getCartQuantity(menu.id);
                        return (
                            <div
                                key={menu.id}
                                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                            >
                                {/* Image */}
                                <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
                                    {menu.image_url ? (
                                        <Image
                                            src={menu.image_url}
                                            alt={menu.name}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <span className="text-3xl">🍽️</span>
                                        </div>
                                    )}
                                    {quantity > 0 && (
                                        <div className="absolute top-2 right-2">
                                            <Badge className="bg-blue-600 text-white">{quantity}</Badge>
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-3">
                                    <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                        {menu.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                        ¥{menu.price.toLocaleString()}
                                    </p>

                                    {/* Add/Remove buttons */}
                                    <div className="mt-2">
                                        {quantity === 0 ? (
                                            <Button
                                                size="sm"
                                                className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                                                onClick={() => addToCart(menu)}
                                            >
                                                <Plus className="h-4 w-4 mr-1" />
                                                追加
                                            </Button>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-8 w-8 rounded-full"
                                                    onClick={() => removeFromCart(menu.id)}
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {quantity}
                                                </span>
                                                <Button
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                                                    onClick={() => addToCart(menu)}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredMenus.length === 0 && (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        メニューがありません
                    </div>
                )}
            </div>

            {/* Cart FAB */}
            {cartItemCount > 0 && !isCartOpen && (
                <button
                    type="button"
                    onClick={() => setIsCartOpen(true)}
                    className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-4 shadow-lg flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
                >
                    <div className="relative">
                        <ShoppingCart className="h-6 w-6" />
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                            {cartItemCount}
                        </span>
                    </div>
                    <span className="font-bold">¥{cartTotal.toLocaleString()}</span>
                </button>
            )}

            {/* Cart drawer */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setIsCartOpen(false)}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                カート ({cartItemCount}点)
                            </h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsCartOpen(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Cart items */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {cart.map(item => (
                                <div
                                    key={item.menu.id}
                                    className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-3"
                                >
                                    {/* Image */}
                                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                                        {item.menu.image_url ? (
                                            <Image
                                                src={item.menu.image_url}
                                                alt={item.menu.name}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <span className="text-xl">🍽️</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                            {item.menu.name}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            ¥{item.menu.price.toLocaleString()}
                                        </p>
                                    </div>

                                    {/* Quantity controls */}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-8 w-8 rounded-full"
                                            onClick={() => removeFromCart(item.menu.id)}
                                        >
                                            <Minus className="h-4 w-4" />
                                        </Button>
                                        <span className="w-6 text-center font-medium text-gray-900 dark:text-white">
                                            {item.quantity}
                                        </span>
                                        <Button
                                            size="icon"
                                            className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                                            onClick={() => addToCart(item.menu)}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">合計</span>
                                <span className="text-xl font-bold text-gray-900 dark:text-white">
                                    ¥{cartTotal.toLocaleString()}
                                </span>
                            </div>
                            <Button
                                className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
                                onClick={submitOrder}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    "注文を確定する"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Order history drawer */}
            {isHistoryOpen && (
                <div className="fixed inset-0 z-50">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setIsHistoryOpen(false)}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                注文履歴
                            </h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsHistoryOpen(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Order list */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {isLoadingHistory ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                </div>
                            ) : orderHistory.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                    注文履歴がありません
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {orderHistory.map(order => (
                                        <div
                                            key={order.id}
                                            className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl p-3"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {order.item_name}
                                                    </span>
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        ×{order.quantity}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    <Clock className="h-3 w-3" />
                                                    <span>{formatJSTTime(order.created_at)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                                    ¥{order.amount.toLocaleString()}
                                                </span>
                                                {order.status === "completed" ? (
                                                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                                        <Check className="h-3 w-3 mr-1" />
                                                        提供済
                                                    </Badge>
                                                ) : order.status === "cancelled" ? (
                                                    <Badge variant="destructive">
                                                        キャンセル
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                        準備中
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
