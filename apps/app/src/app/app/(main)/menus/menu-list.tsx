"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, MenuCategory } from "./actions";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Search, Sparkles, Filter, AlertTriangle, Package } from "lucide-react";
import { MenuEditModal } from "./menu-edit-modal";
import { MenuAIModal } from "./menu-ai-modal";
import { StoreLocationInfo } from "./actions";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface MenuListProps {
    initialMenus: Menu[];
    categories: MenuCategory[];
    canEdit?: boolean;
    storeInfo?: StoreLocationInfo;
}

type VisibilityFilter = "visible" | "hidden";

export function MenuList({ initialMenus, categories, canEdit = false, storeInfo }: MenuListProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
    const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("visible");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

    // Vercel-style tabs
    const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    useEffect(() => {
        const activeButton = tabsRef.current[visibilityFilter];
        if (activeButton) {
            setIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
            });
        }
    }, [visibilityFilter]);

    const activeFilters = useMemo(() => [
        searchQuery.trim() && `"${searchQuery}"`,
        selectedCategoryId !== "all" && categories.find(c => c.id === selectedCategoryId)?.name,
    ].filter(Boolean) as string[], [searchQuery, selectedCategoryId, categories]);
    const hasFilters = activeFilters.length > 0;

    const getFilterSummary = useCallback(() => {
        if (!hasFilters) return "なし";
        return activeFilters.join("・");
    }, [hasFilters, activeFilters]);

    const filteredMenus = useMemo(() => initialMenus.filter((menu) => {
        const matchesSearch = menu.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategoryId === "all" || menu.category_id === selectedCategoryId;
        const matchesVisibility = visibilityFilter === "visible" ? !menu.is_hidden : menu.is_hidden;
        return matchesSearch && matchesCategory && matchesVisibility;
    }), [initialMenus, searchQuery, selectedCategoryId, visibilityFilter]);

    const visibleCount = useMemo(() => initialMenus.filter(m => !m.is_hidden).length, [initialMenus]);
    const hiddenCount = useMemo(() => initialMenus.filter(m => m.is_hidden).length, [initialMenus]);

    const handleEdit = (menu: Menu) => {
        setEditingMenu(menu);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingMenu(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-2">
            {/* Top row: Filter + AI + Plus button */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    className={`flex items-center gap-1 px-1 py-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        hasFilters ? "text-blue-600" : "text-gray-500 dark:text-gray-400"
                    }`}
                    onClick={() => setIsFilterDialogOpen(true)}
                >
                    <Filter className="h-5 w-5 shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        フィルター: {getFilterSummary()}
                    </span>
                </button>

                {canEdit && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none hover:from-purple-600 hover:to-pink-600 hover:text-white"
                            onClick={() => setIsAIModalOpen(true)}
                        >
                            <Sparkles className="h-4 w-4" />
                            AI読取
                        </Button>
                        <Button
                            size="icon"
                            className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                            onClick={handleCreate}
                        >
                            <Plus className="h-5 w-5" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Vercel-style Tab Navigation */}
            <div className="relative">
                <div className="flex w-full">
                    <button
                        ref={(el) => { tabsRef.current["visible"] = el; }}
                        type="button"
                        onClick={() => setVisibilityFilter("visible")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                            visibilityFilter === "visible"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        表示中 ({visibleCount})
                    </button>
                    <button
                        ref={(el) => { tabsRef.current["hidden"] = el; }}
                        type="button"
                        onClick={() => setVisibilityFilter("hidden")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                            visibilityFilter === "hidden"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        非表示 ({hiddenCount})
                    </button>
                </div>
                <div
                    className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-200"
                    style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <Table>
                    <TableHeader>
                        <TableRow className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-2/5">メニュー名</TableHead>
                            <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/5">カテゴリー</TableHead>
                            <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/5">金額</TableHead>
                            <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/5">在庫</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredMenus.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="px-3 sm:px-4 text-center py-8 text-gray-500 dark:text-gray-400">
                                    メニューが見つかりません
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredMenus.map((menu) => {
                                const isOutOfStock = menu.stock_enabled && menu.stock_quantity === 0;
                                const isLowStock = menu.stock_enabled && menu.stock_quantity > 0 && menu.stock_quantity <= (menu.stock_alert_threshold ?? 3);

                                return (
                                    <TableRow
                                        key={menu.id}
                                        className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                                        onClick={() => handleEdit(menu)}
                                    >
                                        <TableCell className="px-3 sm:px-4 text-center text-gray-900 dark:text-white">{menu.name}</TableCell>
                                        <TableCell className="px-3 sm:px-4 text-center">
                                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                                {menu.category?.name || "未分類"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-3 sm:px-4 text-center text-gray-900 dark:text-white">
                                            ¥{menu.price.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="px-3 sm:px-4 text-center">
                                            {menu.stock_enabled ? (
                                                isOutOfStock ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                        <Package className="h-3 w-3" />
                                                        売切
                                                    </span>
                                                ) : isLowStock ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        残{menu.stock_quantity}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                        <Package className="h-3 w-3" />
                                                        {menu.stock_quantity}
                                                    </span>
                                                )
                                            ) : (
                                                <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <MenuEditModal
                menu={editingMenu}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                categories={categories}
                canEdit={canEdit}
                storeInfo={storeInfo}
            />

            <MenuAIModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                categories={categories}
                onSuccess={() => {
                    router.refresh();
                }}
            />

            {/* フィルターダイアログ */}
            <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">フィルター</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                メニュー名で検索
                            </label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="メニュー名で検索..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 bg-white dark:bg-gray-800"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                カテゴリー
                            </label>
                            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                <SelectTrigger className="w-full bg-white dark:bg-gray-800">
                                    <SelectValue placeholder="カテゴリー" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">すべてのカテゴリー</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSearchQuery("");
                                setSelectedCategoryId("all");
                            }}
                            className="rounded-lg"
                        >
                            リセット
                        </Button>
                        <Button
                            onClick={() => setIsFilterDialogOpen(false)}
                            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            適用
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
