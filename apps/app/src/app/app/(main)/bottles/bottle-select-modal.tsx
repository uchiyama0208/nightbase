"use client";

import { useState, useMemo } from "react";
import { Search, Wine, ChevronLeft, Plus } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Menu {
    id: string;
    name: string;
    category: string | null;
    price: number | null;
    image_url?: string | null;
}

interface BottleSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (menuId: string) => void;
    onAddNew: () => void;
    onViewMenu?: (menu: Menu) => void;
    menus: Menu[];
    selectedMenuId?: string;
}

export function BottleSelectModal({
    isOpen,
    onClose,
    onSelect,
    onAddNew,
    onViewMenu,
    menus,
    selectedMenuId,
}: BottleSelectModalProps) {
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // 全カテゴリを取得
    const allCategories = useMemo(() => {
        const categorySet = new Set<string>();
        menus.forEach((menu) => {
            const categoryName = (menu.category as { name?: string } | null)?.name || "その他";
            categorySet.add(categoryName);
        });
        return Array.from(categorySet).sort();
    }, [menus]);

    // カテゴリと検索でフィルタリング
    const filteredMenus = useMemo(() => {
        const searchLower = search.toLowerCase();
        return menus.filter((menu) => {
            const matchesSearch = menu.name.toLowerCase().includes(searchLower);
            const categoryName = (menu.category as { name?: string } | null)?.name || "その他";
            const matchesCategory = !selectedCategory || categoryName === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [menus, search, selectedCategory]);

    const handleSelect = (menuId: string) => {
        onSelect(menuId);
        onClose();
    };

    const handleCategoryClick = (category: string) => {
        setSelectedCategory(selectedCategory === category ? null : category);
    };

    const totalCount = filteredMenus.length;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl sm:max-w-md w-[95%] bg-white dark:bg-gray-900">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        ボトルを選択
                    </DialogTitle>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            onClose();
                            onAddNew();
                        }}
                        className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </DialogHeader>

                {/* Search */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="ボトル名で検索..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Category Tags */}
                {allCategories.length > 0 && (
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <div className="flex flex-wrap gap-2">
                            {allCategories.map((category) => (
                                <button
                                    key={category}
                                    type="button"
                                    onClick={() => handleCategoryClick(category)}
                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                        selectedCategory === category
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {totalCount === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <Wine className="h-12 w-12 mb-3 text-gray-300 dark:text-gray-600" />
                            <p className="text-sm">
                                {search ? "該当するボトルがありません" : "ボトルがありません"}
                            </p>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    onClose();
                                    onAddNew();
                                }}
                                className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            >
                                <Plus className="h-5 w-5 mr-1" />
                                新しいボトルを追加
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredMenus.map((menu) => (
                                <div
                                    key={menu.id}
                                    className={`w-full px-4 py-3 flex items-center gap-3 ${
                                        selectedMenuId === menu.id
                                            ? "bg-blue-50 dark:bg-blue-900/20"
                                            : ""
                                    }`}
                                >
                                    {/* Image or Icon - クリックでメニュー詳細 */}
                                    <button
                                        type="button"
                                        onClick={() => onViewMenu?.(menu)}
                                        className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0 hover:opacity-70 transition-opacity"
                                    >
                                        {menu.image_url ? (
                                            <img
                                                src={menu.image_url}
                                                alt={menu.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Wine className="h-6 w-6 text-gray-400" />
                                        )}
                                    </button>

                                    {/* Info - クリックで選択 */}
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(menu.id)}
                                        className="flex-1 min-w-0 text-left hover:opacity-70 transition-opacity"
                                    >
                                        <p className={`text-sm font-medium truncate ${
                                            selectedMenuId === menu.id
                                                ? "text-blue-600 dark:text-blue-400"
                                                : "text-gray-900 dark:text-white"
                                        }`}>
                                            {menu.name}
                                        </p>
                                        {menu.price && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                ¥{menu.price.toLocaleString()}
                                            </p>
                                        )}
                                    </button>

                                    {/* Selected indicator */}
                                    {selectedMenuId === menu.id && (
                                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
