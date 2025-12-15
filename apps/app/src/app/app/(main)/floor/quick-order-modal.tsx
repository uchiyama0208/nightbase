"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, X, ShoppingCart, PlusCircle, History, ChevronLeft, Clock, User, Users, RefreshCcw, AlertTriangle, Package } from "lucide-react";
import { getMenus, getMenuCategories } from "./actions/menu";
import { createOrder, getSessionOrders } from "./actions/order";
import { MenuEditModal } from "@/app/app/(main)/menus/menu-edit-modal";
import { useToast } from "@/components/ui/use-toast";
import { TableSession } from "@/types/floor";
import { Table } from "@/types/floor";
import { formatTime } from "./utils/format";

interface QuickOrderModalProps {
    session: TableSession;
    table: Table | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOrderComplete: () => void;
    initialTarget?: string;
}

interface MenuCategory {
    id: string;
    name: string;
    sort_order: number;
}

interface Menu {
    id: string;
    name: string;
    price: number;
    category_id: string | null;
    is_for_guest?: boolean;
    is_for_cast?: boolean;
    is_hidden?: boolean;
    hide_from_slip?: boolean;
    created_at?: string;
    updated_at?: string;
    store_id?: string;
    menu_categories?: MenuCategory | null;
    stock_enabled?: boolean;
    stock_quantity?: number;
    stock_alert_threshold?: number;
    image_url?: string | null;
}

interface OrderHistoryItem {
    id: string;
    item_name: string;
    quantity: number;
    amount: number;
    created_at: string;
    menu?: { name: string; price: number };
    cast?: { id: string; display_name: string };
    guest?: { id: string; display_name: string };
}

export function QuickOrderModal({ session, table, open, onOpenChange, onOrderComplete, initialTarget }: QuickOrderModalProps) {
    const [menus, setMenus] = useState<Menu[]>([]);
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [cart, setCart] = useState<{ [menuId: string]: number }>({});
    const [selectedTarget, setSelectedTarget] = useState<string>(initialTarget || "table");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // View state instead of multiple dialog states
    const [view, setView] = useState<'order' | 'history' | 'menu-type-select' | 'create-temp-menu'>('order');

    // Create Temporary Menu State
    const [newMenuName, setNewMenuName] = useState("");
    const [newMenuPrice, setNewMenuPrice] = useState("");

    const [tempMenus, setTempMenus] = useState<Menu[]>([]);

    // MenuEditModal State
    const [isMenuEditModalOpen, setIsMenuEditModalOpen] = useState(false);

    // History State
    const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
    const [historyFilter, setHistoryFilter] = useState<string>("all");

    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            loadData();
            setCart({});
            setSelectedTarget(initialTarget || "table");
            setTempMenus([]);
            setHistoryFilter("all");
            setView('order');
        }
    }, [open, initialTarget]);

    useEffect(() => {
        if (view === 'history' && session?.id) {
            loadHistory();
        }
    }, [view, session?.id]);

    const loadData = async () => {
        const [menusData, categoriesData] = await Promise.all([
            getMenus(),
            getMenuCategories(),
        ]);
        setMenus(menusData as Menu[]);
        setCategories(categoriesData as MenuCategory[]);
        if (categoriesData.length > 0) {
            setSelectedCategoryId(categoriesData[0].id);
        }
    };

    const loadHistory = async () => {
        if (!session?.id) return;
        const history = await getSessionOrders(session.id);
        setOrderHistory(history as any);
    };

    const filteredHistory = useMemo(() => {
        if (historyFilter === "all") return orderHistory;

        if (historyFilter.startsWith("guest:")) {
            const guestId = historyFilter.replace("guest:", "");
            return orderHistory.filter(order => order.guest?.id === guestId || (order as any).guest_id === guestId);
        }

        if (historyFilter.startsWith("cast:")) {
            const castId = historyFilter.replace("cast:", "");
            return orderHistory.filter(order => order.cast?.id === castId || (order as any).cast_id === castId);
        }

        return orderHistory;
    }, [orderHistory, historyFilter]);

    const filteredMenus = useMemo(() => {
        let filtered = [...menus, ...tempMenus];

        // Filter by category
        if (selectedCategoryId) {
            filtered = filtered.filter(m => m.category_id === selectedCategoryId || m.id.startsWith('temp-'));
        }

        // Filter hidden menus
        filtered = filtered.filter(m => !m.is_hidden);

        // Filter by target
        if (selectedTarget === 'table') {
            // Show all visible menus
        } else if (selectedTarget.startsWith('guest:')) {
            // Show guest menus
            filtered = filtered.filter(m => m.is_for_guest);
        } else if (selectedTarget.startsWith('cast:')) {
            // Show cast menus
            filtered = filtered.filter(m => m.is_for_cast);
        }

        return filtered;
    }, [menus, tempMenus, selectedCategoryId, selectedTarget]);

    const addToCart = (menuId: string) => {
        setCart(prev => ({ ...prev, [menuId]: (prev[menuId] || 0) + 1 }));
    };

    const removeFromCart = (menuId: string) => {
        setCart(prev => {
            const newCount = (prev[menuId] || 0) - 1;
            if (newCount <= 0) {
                const { [menuId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [menuId]: newCount };
        });
    };

    const handleReorder = (order: OrderHistoryItem) => {
        // If it's a regular menu item
        if ((order as any).menu_id) {
            const menuExists = menus.find(m => m.id === (order as any).menu_id);
            if (menuExists) {
                addToCart((order as any).menu_id);
                toast({ title: "カートに追加しました" });
            } else {
                toast({ title: "このメニューは現在利用できません" });
            }
        } else {
            // It's a temporary item
            const tempId = `temp-${Date.now()}`;
            const tempMenu: Menu = {
                id: tempId,
                name: order.item_name || "不明な商品",
                price: order.amount,
                category_id: "",
                is_for_guest: true,
                is_for_cast: true,
                is_hidden: false,
                hide_from_slip: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                store_id: "",
            };

            const unitPrice = order.quantity > 0 ? Math.round(order.amount / order.quantity) : order.amount;
            tempMenu.price = unitPrice;

            setTempMenus(prev => [...prev, tempMenu]);
            addToCart(tempId);
            toast({ title: "カートに追加しました" });
        }
    };

    const handleOrder = async () => {
        if (!session) return;

        const items = Object.entries(cart).map(([menuId, quantity]) => {
            const menu = [...menus, ...tempMenus].find(m => m.id === menuId);
            return {
                menuId,
                quantity,
                amount: menu ? menu.price * quantity : 0,
                name: menu?.name
            };
        });

        if (items.length === 0) return;

        setIsSubmitting(true);
        try {
            let guestId: string | null = null;
            let castId: string | null = null;

            if (selectedTarget.startsWith('guest:')) {
                guestId = selectedTarget.replace('guest:', '');
            } else if (selectedTarget.startsWith('cast:')) {
                castId = selectedTarget.replace('cast:', '');
            }

            await createOrder(session.id, items, guestId, castId);
            toast({ title: "注文を送信しました" });
            onOrderComplete();
            onOpenChange(false);
        } catch (error) {
            toast({ title: "注文送信に失敗しました" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateTempMenu = async () => {
        if (!newMenuName || !newMenuPrice) {
            toast({ title: "メニュー名と金額を入力してください" });
            return;
        }

        const price = parseInt(newMenuPrice);
        if (isNaN(price)) {
            toast({ title: "金額は数値で入力してください" });
            return;
        }

        // Create temporary menu
        const tempId = `temp-${Date.now()}`;
        const tempMenu: Menu = {
            id: tempId,
            name: newMenuName,
            price: price,
            category_id: selectedCategoryId || "",
            is_for_guest: true,
            is_for_cast: true,
            is_hidden: false,
            hide_from_slip: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            store_id: "",
        };
        setTempMenus(prev => [...prev, tempMenu]);
        addToCart(tempId);
        setView('order');
        // Reset form
        setNewMenuName("");
        setNewMenuPrice("");
        toast({ title: "一時メニューを作成しました" });
    };

    const handleMenuEditModalClose = async () => {
        setIsMenuEditModalOpen(false);
        // Reload menus to get the newly created menu
        await loadData();
        // Return to order view
        setView('order');
    };

    const totalAmount = Object.entries(cart).reduce((sum, [menuId, quantity]) => {
        const menu = [...menus, ...tempMenus].find(m => m.id === menuId);
        return sum + (menu ? menu.price * quantity : 0);
    }, 0);

    const totalItems = Object.values(cart).reduce((sum, q) => sum + q, 0);

    // Build target options
    const targetOptions = useMemo(() => {
        const optionsMap = new Map<string, { value: string; label: string }>();

        // Add table option
        optionsMap.set("table", { value: "table", label: "テーブル全体" });

        if ((session as any)?.cast_assignments) {
            (session as any).cast_assignments.forEach((assignment: any) => {
                // If this is a guest assignment (guest_id exists and guest_profile is populated)
                if (assignment.guest_id && assignment.guest_profile) {
                    const guestKey = `guest:${assignment.guest_id}`;
                    if (!optionsMap.has(guestKey)) {
                        optionsMap.set(guestKey, {
                            value: guestKey,
                            label: assignment.guest_profile?.display_name || "ゲスト"
                        });
                    }
                }
                // If this is a cast assignment (cast_id !== guest_id)
                if (assignment.cast_id !== assignment.guest_id) {
                    const castKey = `cast:${assignment.cast_id}`;
                    if (!optionsMap.has(castKey)) {
                        optionsMap.set(castKey, {
                            value: castKey,
                            label: assignment.profiles?.display_name || "キャスト"
                        });
                    }
                }
            });
        }

        return Array.from(optionsMap.values());
    }, [session]);

    // Build history filter options
    const historyFilterOptions = useMemo(() => {
        const options = [{ value: "all", label: "全員" }];

        targetOptions.forEach(option => {
            if (option.value !== "table") {
                options.push(option);
            }
        });

        return options;
    }, [targetOptions]);

    const needsFullHeight = view === 'order' || view === 'history';

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className={`max-w-lg flex flex-col p-0 gap-0 ${needsFullHeight ? 'h-[85vh]' : ''}`}>
                    {/* View: Order (Main) */}
                    {view === 'order' && (
                        <>
                            {/* Header */}
                            <div className="px-3 py-2 border-b space-y-2">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 -ml-1"
                                        onClick={() => onOpenChange(false)}
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>
                                    <DialogTitle className="text-base font-bold">{table?.name || "卓なし"} - クイック注文</DialogTitle>
                                </div>

                                <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                                    <SelectTrigger className="w-full h-9">
                                        <SelectValue placeholder="頼んだ人を選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {targetOptions.map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 flex overflow-hidden">
                                {/* Category Sidebar */}
                                <div className="w-24 border-r bg-slate-50 dark:bg-slate-900 flex flex-col">
                                    <div className="flex-1 overflow-y-auto">
                                        {categories.map(category => (
                                            <button
                                                key={category.id}
                                                onClick={() => setSelectedCategoryId(category.id)}
                                                className={`w-full px-2 py-3 text-xs text-left border-b border-slate-200 dark:border-slate-700 transition-colors ${selectedCategoryId === category.id
                                                    ? "bg-blue-500 text-white font-medium"
                                                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    }`}
                                            >
                                                {category.name}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="p-1 border-t border-slate-200 dark:border-slate-700">
                                        <button
                                            type="button"
                                            className="w-full px-1 py-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                                            onClick={() => setView('menu-type-select')}
                                        >
                                            メニュー作成
                                        </button>
                                    </div>
                                </div>

                                {/* Menu List */}
                                <ScrollArea className="flex-1">
                                    <div className="p-2 space-y-1">
                                        {filteredMenus.map(menu => {
                                            const isOutOfStock = menu.stock_enabled && menu.stock_quantity === 0;
                                            const isLowStock = menu.stock_enabled && (menu.stock_quantity ?? 0) > 0 && (menu.stock_quantity ?? 0) <= (menu.stock_alert_threshold ?? 3);

                                            return (
                                                <div
                                                    key={menu.id}
                                                    className={`flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 ${isOutOfStock ? 'opacity-50' : ''}`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-sm truncate">{menu.name}</span>
                                                            {isOutOfStock && (
                                                                <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400 shrink-0">
                                                                    <Package className="h-2.5 w-2.5" />
                                                                    売切
                                                                </span>
                                                            )}
                                                            {isLowStock && (
                                                                <span className="inline-flex items-center gap-0.5 rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 shrink-0">
                                                                    <AlertTriangle className="h-2.5 w-2.5" />
                                                                    残{menu.stock_quantity}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            ¥{menu.price.toLocaleString()}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1 ml-2">
                                                        {isOutOfStock ? (
                                                            <span className="text-xs text-muted-foreground px-2">在庫なし</span>
                                                        ) : cart[menu.id] > 0 ? (
                                                            <>
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="h-8 w-8"
                                                                    onClick={() => removeFromCart(menu.id)}
                                                                >
                                                                    <Minus className="h-3 w-3" />
                                                                </Button>
                                                                <span className="w-6 text-center text-sm font-medium">
                                                                    {cart[menu.id]}
                                                                </span>
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="h-8 w-8"
                                                                    onClick={() => addToCart(menu.id)}
                                                                >
                                                                    <Plus className="h-3 w-3" />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Button
                                                                size="icon"
                                                                variant="outline"
                                                                className="h-8 w-8"
                                                                onClick={() => addToCart(menu.id)}
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {filteredMenus.length === 0 && (
                                            <div className="text-center py-8 text-muted-foreground text-sm">
                                                メニューがありません
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* Footer */}
                            <div className="px-3 py-2 border-t bg-slate-50 dark:bg-slate-900 space-y-2">
                                {totalItems > 0 && (
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <ShoppingCart className="h-4 w-4" />
                                            <span>{totalItems}点</span>
                                        </div>
                                        <span className="font-bold">¥{totalAmount.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 shrink-0"
                                        onClick={() => setView('history')}
                                    >
                                        <History className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        className="flex-1 h-10"
                                        onClick={handleOrder}
                                        disabled={totalItems === 0 || isSubmitting}
                                    >
                                        {isSubmitting ? "送信中..." : "注文を確定する"}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* View: Menu Type Selection */}
                    {view === 'menu-type-select' && (
                        <>
                            <div className="px-3 py-2 border-b flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 -ml-1"
                                    onClick={() => setView('order')}
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <DialogTitle className="text-base font-bold">メニュー作成方法を選択</DialogTitle>
                            </div>
                            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
                                <Button
                                    className="w-full max-w-sm h-12"
                                    onClick={() => setIsMenuEditModalOpen(true)}
                                >
                                    通常メニュー登録
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full max-w-sm h-12"
                                    onClick={() => setView('create-temp-menu')}
                                >
                                    一時的なメニュー作成
                                </Button>
                            </div>
                        </>
                    )}

                    {/* View: Create Temporary Menu */}
                    {view === 'create-temp-menu' && (
                        <>
                            <div className="px-3 py-2 border-b flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 -ml-1"
                                    onClick={() => setView('menu-type-select')}
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <DialogTitle className="text-base font-bold">一時メニュー作成</DialogTitle>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="menu-name">メニュー名</Label>
                                    <Input
                                        id="menu-name"
                                        value={newMenuName}
                                        onChange={(e) => setNewMenuName(e.target.value)}
                                        placeholder="例: オリジナルカクテル"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="menu-price">金額 (円)</Label>
                                    <Input
                                        id="menu-price"
                                        type="number"
                                        value={newMenuPrice}
                                        onChange={(e) => setNewMenuPrice(e.target.value)}
                                        placeholder="1000"
                                    />
                                </div>
                                <div className="flex flex-col gap-2 pt-2">
                                    <Button onClick={handleCreateTempMenu}>決定</Button>
                                    <Button variant="outline" onClick={() => setView('menu-type-select')}>キャンセル</Button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* View: History */}
                    {view === 'history' && (
                        <>
                            <div className="px-3 py-2 border-b space-y-2">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 -ml-1"
                                        onClick={() => setView('order')}
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>
                                    <DialogTitle className="text-base font-bold">注文履歴</DialogTitle>
                                </div>

                                <Select value={historyFilter} onValueChange={setHistoryFilter}>
                                    <SelectTrigger className="w-full h-9">
                                        <SelectValue placeholder="表示対象を選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {historyFilterOptions.map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="p-3 space-y-3">
                                    {filteredHistory.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            注文履歴がありません
                                        </div>
                                    ) : (
                                        filteredHistory.map((order) => (
                                            <div key={order.id} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0">
                                                <div className="flex-1">
                                                    <div className="font-medium text-base">
                                                        {order.item_name || order.menu?.name || "不明な商品"}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                            <Clock className="h-3 w-3" />
                                                            {formatTime(order.created_at)}
                                                        </span>

                                                        {order.cast ? (
                                                            <span className="flex items-center gap-1 text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20 px-1.5 py-0.5 rounded">
                                                                <User className="h-3 w-3" />
                                                                {order.cast.display_name}
                                                            </span>
                                                        ) : order.guest ? (
                                                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                                                                <User className="h-3 w-3" />
                                                                {order.guest.display_name}
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                                <Users className="h-3 w-3" />
                                                                テーブル全体
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 ml-4">
                                                    <div className="text-right">
                                                        <div className="font-bold text-lg">
                                                            ¥{order.amount.toLocaleString()}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            x{order.quantity}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleReorder(order)}
                                                    >
                                                        再注文
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>

                            {/* Footer for History View */}
                            <div className="px-3 py-2 border-t bg-slate-50 dark:bg-slate-900 space-y-2">
                                {totalItems > 0 && (
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <ShoppingCart className="h-4 w-4" />
                                            <span>{totalItems}点</span>
                                        </div>
                                        <span className="font-bold">¥{totalAmount.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <Button
                                        className="flex-1 h-10"
                                        onClick={handleOrder}
                                        disabled={totalItems === 0 || isSubmitting}
                                    >
                                        {isSubmitting ? "送信中..." : "注文を確定する"}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* MenuEditModal for regular menu creation */}
            <MenuEditModal
                menu={null}
                open={isMenuEditModalOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        handleMenuEditModalClose();
                    }
                }}
                categories={categories as any}
            />
        </>
    );
}
