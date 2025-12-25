"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ShoppingCart, Minus, Plus, ChevronLeft } from "lucide-react";
import { getMenus } from "./actions/menu";
import { createOrder } from "./actions/order";
import { useToast } from "@/components/ui/use-toast";
import { TableSession } from "@/types/floor";

interface OrderModalProps {
    session: TableSession | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOrderComplete: () => void;
}

export function OrderModal({ session, open, onOpenChange, onOrderComplete }: OrderModalProps) {
    const [menus, setMenus] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [cart, setCart] = useState<{ [menuId: string]: number }>({});
    const [selectedTarget, setSelectedTarget] = useState<string>("table"); // 'table' | guestId | castId
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            loadMenus();
            setCart({});
            setSelectedTarget("table");
        }
    }, [open]);

    const loadMenus = async () => {
        const data = await getMenus();
        setMenus(data);
    };

    const categories = useMemo(() => {
        const cats = new Set(menus.map(m => m.category));
        return Array.from(cats).sort();
    }, [menus]);

    const filteredMenus = useMemo(() => {
        return menus.filter(m =>
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [menus, searchQuery]);

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

    const handleOrder = async () => {
        if (!session) return;

        const items = Object.entries(cart).map(([menuId, quantity]) => {
            const menu = menus.find(m => m.id === menuId);
            return {
                menuId,
                quantity,
                amount: menu ? menu.price * quantity : 0
            };
        });

        if (items.length === 0) return;

        try {
            // Determine guestId/castId based on selectedTarget
            // For now, simple logic: if it's not 'table', assume it's a guest or cast ID
            // In a real app, we'd distinguish between guest and cast IDs more explicitly
            const guestId = selectedTarget !== 'table' ? selectedTarget : null; // Simplified

            await createOrder(session.id, items, guestId, null);
            toast({ title: "注文を送信しました" });
            onOrderComplete();
            onOpenChange(false);
        } catch (error) {
            toast({ title: "注文送信に失敗しました" });
        }
    };

    const totalAmount = Object.entries(cart).reduce((sum, [menuId, quantity]) => {
        const menu = menus.find(m => m.id === menuId);
        return sum + (menu ? menu.price * quantity : 0);
    }, 0);

    const totalItems = Object.values(cart).reduce((sum, q) => sum + q, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl w-[95%] p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl bg-white dark:bg-gray-900">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">注文入力</DialogTitle>
                    <div className="w-8 h-8" />
                </DialogHeader>
                <div className="p-4 border-b">

                    {/* Target Selector */}
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                        <Button
                            variant={selectedTarget === 'table' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedTarget('table')}
                        >
                            テーブル (全員)
                        </Button>

                        {/* Main Guest */}
                        {session?.main_guest_id && (
                            <Button
                                variant={selectedTarget === session.main_guest_id ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedTarget(session.main_guest_id!)}
                            >
                                メインゲスト
                            </Button>
                        )}

                        {/* Assigned Casts */}
                        {(session as any)?.cast_assignments?.map((assignment: any) => (
                            <Button
                                key={assignment.id}
                                variant={selectedTarget === assignment.cast_id ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedTarget(assignment.cast_id)}
                            >
                                {assignment.profiles?.display_name || assignment.profiles?.name} (キャスト)
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Menu Selection */}
                    <div className="flex-1 flex flex-col border-r">
                        <div className="p-4 border-b">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="メニューを検索..."
                                    className="pl-8"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <Tabs defaultValue={categories[0]} className="flex-1 flex flex-col">
                            <div className="px-4 pt-2 border-b bg-muted/30">
                                <TabsList className="w-full justify-start overflow-x-auto h-auto p-0 bg-transparent gap-2">
                                    {categories.map(cat => (
                                        <TabsTrigger
                                            key={cat}
                                            value={cat}
                                            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-2"
                                        >
                                            {cat}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>

                            <ScrollArea className="flex-1 p-4">
                                {categories.map(cat => (
                                    <TabsContent key={cat} value={cat} className="mt-0">
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {filteredMenus
                                                .filter(m => m.category === cat)
                                                .map(menu => (
                                                    <Button
                                                        key={menu.id}
                                                        variant="outline"
                                                        className="h-24 flex flex-col items-center justify-center gap-2 whitespace-normal text-center hover:border-primary hover:bg-primary/5"
                                                        onClick={() => addToCart(menu.id)}
                                                    >
                                                        <span className="font-medium line-clamp-2">{menu.name}</span>
                                                        <span className="text-sm text-muted-foreground">¥{menu.price.toLocaleString()}</span>
                                                        {cart[menu.id] > 0 && (
                                                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">
                                                                {cart[menu.id]}
                                                            </div>
                                                        )}
                                                    </Button>
                                                ))}
                                        </div>
                                    </TabsContent>
                                ))}
                            </ScrollArea>
                        </Tabs>
                    </div>

                    {/* Cart Sidebar */}
                    <div className="w-80 flex flex-col bg-gray-50 dark:bg-gray-900">
                        <div className="p-4 border-b font-semibold flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            カート ({totalItems})
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                {Object.entries(cart).map(([menuId, quantity]) => {
                                    const menu = menus.find(m => m.id === menuId);
                                    if (!menu) return null;
                                    return (
                                        <div key={menuId} className="flex justify-between items-center bg-background p-3 rounded-lg border shadow-sm">
                                            <div className="flex-1">
                                                <div className="font-medium text-sm">{menu.name}</div>
                                                <div className="text-xs text-muted-foreground">¥{menu.price.toLocaleString()}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeFromCart(menuId)}>
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-4 text-center text-sm">{quantity}</span>
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => addToCart(menuId)}>
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>

                        <div className="p-4 border-t bg-background space-y-4">
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>合計</span>
                                <span>¥{totalAmount.toLocaleString()}</span>
                            </div>
                            <Button className="w-full size-lg" onClick={handleOrder} disabled={totalItems === 0}>
                                注文を確定する
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
