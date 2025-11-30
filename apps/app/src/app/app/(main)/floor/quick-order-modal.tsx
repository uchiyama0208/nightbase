"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Minus, Plus, X, ShoppingCart } from "lucide-react";
import { getMenus, getMenuCategories, createOrder } from "./actions";
import { useToast } from "@/components/ui/use-toast";
import { TableSession } from "@/types/floor";
import { Table } from "@/types/floor";

interface QuickOrderModalProps {
    session: TableSession;
    table: Table;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOrderComplete: () => void;
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
    category_id: string;
    menu_categories?: MenuCategory;
}

export function QuickOrderModal({ session, table, open, onOpenChange, onOrderComplete }: QuickOrderModalProps) {
    const [menus, setMenus] = useState<Menu[]>([]);
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [cart, setCart] = useState<{ [menuId: string]: number }>({});
    const [selectedTarget, setSelectedTarget] = useState<string>("table");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            loadData();
            setCart({});
            setSelectedTarget("table");
        }
    }, [open]);

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

    const filteredMenus = useMemo(() => {
        if (!selectedCategoryId) return menus;
        return menus.filter(m => m.category_id === selectedCategoryId);
    }, [menus, selectedCategoryId]);

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

        setIsSubmitting(true);
        try {
            const guestId = selectedTarget !== 'table' ? selectedTarget : null;
            await createOrder(session.id, items, guestId, null);
            toast({ title: "注文を送信しました" });
            onOrderComplete();
            onOpenChange(false);
        } catch (error) {
            toast({ title: "注文送信に失敗しました" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalAmount = Object.entries(cart).reduce((sum, [menuId, quantity]) => {
        const menu = menus.find(m => m.id === menuId);
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
                    const guestKey = `guest-${assignment.guest_id}`;
                    if (!optionsMap.has(guestKey)) {
                        optionsMap.set(guestKey, {
                            value: assignment.guest_id,
                            label: assignment.guest_profile?.display_name || "ゲスト"
                        });
                    }
                }
                // If this is a cast assignment (cast_id !== guest_id)
                if (assignment.cast_id !== assignment.guest_id) {
                    const castKey = `cast-${assignment.cast_id}`;
                    if (!optionsMap.has(castKey)) {
                        optionsMap.set(castKey, {
                            value: assignment.cast_id,
                            label: assignment.profiles?.display_name || "キャスト"
                        });
                    }
                }
            });
        }

        return Array.from(optionsMap.values());
    }, [session]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg h-[85vh] flex flex-col p-0 gap-0">
                {/* Header */}
                <div className="p-4 border-b space-y-3">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-bold">{table.name} - クイック注文</DialogTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                        <SelectTrigger className="w-full">
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
                    <div className="w-24 border-r bg-slate-50 dark:bg-slate-900 overflow-y-auto">
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

                    {/* Menu List */}
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                            {filteredMenus.map(menu => (
                                <div
                                    key={menu.id}
                                    className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{menu.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            ¥{menu.price.toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 ml-2">
                                        {cart[menu.id] > 0 ? (
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
                                                size="sm"
                                                variant="outline"
                                                onClick={() => addToCart(menu.id)}
                                            >
                                                <Plus className="h-3 w-3 mr-1" />
                                                追加
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {filteredMenus.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    メニューがありません
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-slate-50 dark:bg-slate-900 space-y-3">
                    {totalItems > 0 && (
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4" />
                                <span>{totalItems}点</span>
                            </div>
                            <span className="font-bold">¥{totalAmount.toLocaleString()}</span>
                        </div>
                    )}
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={handleOrder}
                        disabled={totalItems === 0 || isSubmitting}
                    >
                        {isSubmitting ? "送信中..." : "注文を確定する"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
