"use client";

import { useMemo, useState, useCallback } from "react";
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
import { Plus, Search, Sparkles, Filter, ChevronLeft } from "lucide-react";
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
import { VercelTabs } from "@/components/ui/vercel-tabs";

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
                    className={`flex items-center gap-1 px-1 py-1 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
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
                            aria-label="追加"
                        >
                            <Plus className="h-5 w-5" />
                        </Button>
                    </div>
                )}
            </div>

            <VercelTabs
                tabs={[
                    { key: "visible", label: `表示中 (${visibleCount})` },
                    { key: "hidden", label: `非表示 (${hiddenCount})` },
                ]}
                value={visibilityFilter}
                onChange={(val) => setVisibilityFilter(val as VisibilityFilter)}
                className="mb-4"
            />

            <div className="overflow-x-auto rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <Table>
                    <TableHeader>
                        <TableRow className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <TableHead className="px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400">メニュー名</TableHead>
                            <TableHead className="px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400 whitespace-nowrap">カテゴリー</TableHead>
                            <TableHead className="px-2 sm:px-4 text-center text-gray-500 dark:text-gray-400 whitespace-nowrap">金額</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredMenus.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="px-3 sm:px-4 text-center py-8 text-gray-500 dark:text-gray-400">
                                    メニューが見つかりません
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredMenus.map((menu) => (
                                <TableRow
                                    key={menu.id}
                                    className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                                    onClick={() => handleEdit(menu)}
                                >
                                    <TableCell className="px-2 sm:px-4 text-center text-gray-900 dark:text-white">{menu.name}</TableCell>
                                    <TableCell className="px-2 sm:px-4 text-center whitespace-nowrap">
                                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                            {menu.category?.name || "未分類"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-2 sm:px-4 text-center text-gray-900 dark:text-white whitespace-nowrap">
                                        ¥{menu.price.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))
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
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-0">
                    <DialogHeader className="flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={() => setIsFilterDialogOpen(false)}
                            className="p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-gray-900 dark:text-white">フィルター</DialogTitle>
                        <div className="w-7" />
                    </DialogHeader>
                    <div className="space-y-4 p-6">
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
                    <DialogFooter className="flex flex-col gap-2 px-6 pb-6">
                        <Button
                            onClick={() => setIsFilterDialogOpen(false)}
                            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            適用
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsFilterDialogOpen(false)}
                            className="w-full rounded-lg"
                        >
                            戻る
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
