"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Plus,
    Trash2,
    Check,
    AlertTriangle,
    Package,
    ShoppingCart,
    RefreshCcw,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { VercelTabs } from "@/components/ui/vercel-tabs";
import {
    ShoppingItem,
    LowStockMenu,
    addShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem,
    clearCompletedItems,
    addLowStockToShoppingList,
    replenishStock,
} from "./actions";

interface ShoppingListProps {
    initialItems: ShoppingItem[];
    lowStockMenus: LowStockMenu[];
    canEdit?: boolean;
}

type TabType = "list" | "lowstock";

export function ShoppingList({ initialItems, lowStockMenus, canEdit = false }: ShoppingListProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<TabType>("list");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isReplenishDialogOpen, setIsReplenishDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ShoppingItem | null>(null);
    const [replenishQuantity, setReplenishQuantity] = useState(1);
    const [newItemName, setNewItemName] = useState("");
    const [newItemQuantity, setNewItemQuantity] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const pendingItems = initialItems.filter(item => !item.is_completed);
    const completedItems = initialItems.filter(item => item.is_completed);

    const handleAddItem = async () => {
        if (!newItemName.trim()) {
            toast({ title: "商品名を入力してください" });
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.set("name", newItemName);
            formData.set("quantity", newItemQuantity.toString());
            await addShoppingItem(formData);
            toast({ title: "追加しました" });
            setIsAddDialogOpen(false);
            setNewItemName("");
            setNewItemQuantity(1);
            router.refresh();
        } catch (error) {
            toast({ title: "追加に失敗しました" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleItem = async (item: ShoppingItem) => {
        // If completing an item with menu link, show replenish dialog
        if (!item.is_completed && item.menu_id) {
            setSelectedItem(item);
            setReplenishQuantity(item.quantity);
            setIsReplenishDialogOpen(true);
            return;
        }

        try {
            await toggleShoppingItem(item.id, !item.is_completed);
            router.refresh();
        } catch (error) {
            toast({ title: "更新に失敗しました" });
        }
    };

    const handleReplenish = async () => {
        if (!selectedItem) return;

        setIsSubmitting(true);
        try {
            await replenishStock(selectedItem.id, replenishQuantity);
            toast({ title: `在庫を${replenishQuantity}個補充しました` });
            setIsReplenishDialogOpen(false);
            setSelectedItem(null);
            router.refresh();
        } catch (error) {
            toast({ title: "在庫の更新に失敗しました" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkipReplenish = async () => {
        if (!selectedItem) return;

        try {
            await toggleShoppingItem(selectedItem.id, true);
            setIsReplenishDialogOpen(false);
            setSelectedItem(null);
            router.refresh();
        } catch (error) {
            toast({ title: "更新に失敗しました" });
        }
    };

    const handleDeleteItem = async (id: string) => {
        try {
            await deleteShoppingItem(id);
            toast({ title: "削除しました" });
            router.refresh();
        } catch (error) {
            toast({ title: "削除に失敗しました" });
        }
    };

    const handleClearCompleted = async () => {
        try {
            await clearCompletedItems();
            toast({ title: "完了済みアイテムを削除しました" });
            router.refresh();
        } catch (error) {
            toast({ title: "削除に失敗しました" });
        }
    };

    const handleAddLowStockItems = async () => {
        const menuIds = lowStockMenus.map(m => m.id);
        if (menuIds.length === 0) {
            toast({ title: "低在庫メニューがありません" });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await addLowStockToShoppingList(menuIds);
            if (result.added === 0) {
                toast({ title: result.message || "すべて追加済みです" });
            } else {
                toast({ title: `${result.added}件追加しました` });
            }
            router.refresh();
        } catch (error) {
            toast({ title: "追加に失敗しました" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        {pendingItems.length}件の買い出し
                    </span>
                </div>
                {canEdit && (
                    <Button
                        size="icon"
                        className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                        onClick={() => setIsAddDialogOpen(true)}
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {/* Tab Navigation */}
            <VercelTabs
                tabs={[
                    { key: "list", label: `リスト (${initialItems.length})` },
                    { key: "lowstock", label: `低在庫 (${lowStockMenus.length})` }
                ]}
                value={activeTab}
                onChange={(val) => setActiveTab(val as TabType)}
                className="mb-4"
            />

            {/* List Tab */}
            {activeTab === "list" && (
                <div className="space-y-4">
                    {/* Pending Items */}
                    <div className="space-y-2">
                        {pendingItems.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                買い出しリストは空です
                            </div>
                        ) : (
                            pendingItems.map(item => (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700"
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleToggleItem(item)}
                                        className="h-6 w-6 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-green-500 transition-colors"
                                    >
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900 dark:text-white truncate">
                                                {item.name}
                                            </span>
                                            {item.menu_id && (
                                                <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                                                    <Package className="h-2.5 w-2.5" />
                                                    メニュー
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            x{item.quantity}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Completed Items */}
                    {completedItems.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    完了済み ({completedItems.length})
                                </span>
                                <button
                                    type="button"
                                    onClick={handleClearCompleted}
                                    className="text-sm text-red-500 hover:text-red-600"
                                >
                                    すべて削除
                                </button>
                            </div>
                            {completedItems.map(item => (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 opacity-60"
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleToggleItem(item)}
                                        className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center"
                                    >
                                        <Check className="h-3.5 w-3.5 text-white" />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-medium text-gray-500 dark:text-gray-400 line-through truncate">
                                            {item.name}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Low Stock Tab */}
            {activeTab === "lowstock" && (
                <div className="space-y-4">
                    {lowStockMenus.length > 0 && (
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleAddLowStockItems}
                            disabled={isSubmitting}
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            すべてリストに追加
                        </Button>
                    )}

                    {lowStockMenus.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            低在庫のメニューはありません
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {lowStockMenus.map(menu => {
                                const isOutOfStock = menu.stock_quantity === 0;

                                return (
                                    <div
                                        key={menu.id}
                                        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900 dark:text-white truncate">
                                                    {menu.name}
                                                </span>
                                                {isOutOfStock ? (
                                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400 shrink-0">
                                                        <Package className="h-2.5 w-2.5" />
                                                        売切
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 shrink-0">
                                                        <AlertTriangle className="h-2.5 w-2.5" />
                                                        残{menu.stock_quantity}
                                                    </span>
                                                )}
                                            </div>
                                            {menu.category && (
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    {menu.category.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Add Item Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">
                            買い出しアイテムを追加
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                商品名
                            </label>
                            <Input
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                placeholder="例: ウイスキー"
                                className="bg-white dark:bg-gray-800"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                数量
                            </label>
                            <Input
                                type="number"
                                value={newItemQuantity}
                                onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                                min={1}
                                className="bg-white dark:bg-gray-800"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsAddDialogOpen(false)}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleAddItem}
                            disabled={isSubmitting}
                            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            追加
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Replenish Stock Dialog */}
            <Dialog open={isReplenishDialogOpen} onOpenChange={setIsReplenishDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">
                            在庫を補充
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            「{selectedItem?.name}」の在庫を補充しますか？
                        </p>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                補充する数量
                            </label>
                            <Input
                                type="number"
                                value={replenishQuantity}
                                onChange={(e) => setReplenishQuantity(parseInt(e.target.value) || 1)}
                                min={1}
                                className="bg-white dark:bg-gray-800"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex flex-col gap-2">
                        <Button
                            onClick={handleReplenish}
                            disabled={isSubmitting}
                            className="w-full rounded-lg bg-green-600 hover:bg-green-700 text-white"
                        >
                            <RefreshCcw className="h-4 w-4 mr-2" />
                            在庫を補充して完了
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleSkipReplenish}
                            disabled={isSubmitting}
                            className="w-full rounded-lg"
                        >
                            補充せずに完了
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setIsReplenishDialogOpen(false)}
                            className="w-full rounded-lg"
                        >
                            キャンセル
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
