"use client";

import { useMemo, useState } from "react";
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
import { Plus, Search, Settings } from "lucide-react";
import { MenuEditModal } from "./menu-edit-modal";
import { CategoryManageModal } from "./category-manage-modal";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";

interface MenuListProps {
    initialMenus: Menu[];
    categories: MenuCategory[];
}

export function MenuList({ initialMenus, categories }: MenuListProps) {
    const [menus, setMenus] = useState(initialMenus);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<Menu | null>(null);

    const activeFilters = [
        searchQuery.trim() && "検索",
        selectedCategoryId !== "all" && "カテゴリー",
    ].filter(Boolean) as string[];
    const hasFilters = activeFilters.length > 0;

    const filteredMenus = initialMenus.filter((menu) => {
        const matchesSearch = menu.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategoryId === "all" || menu.category_id === selectedCategoryId;
        return matchesSearch && matchesCategory;
    });

    const handleEdit = (menu: Menu) => {
        setEditingMenu(menu);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingMenu(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-end gap-2 mb-4">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm"
                    onClick={() => setIsCategoryModalOpen(true)}
                >
                    <Settings className="h-4 w-4 mr-2" />
                    カテゴリー管理
                </Button>
                <Button
                    size="icon"
                    className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                    onClick={handleCreate}
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </div>

            <Accordion type="single" collapsible className="w-full mb-4">
                <AccordionItem
                    value="filters"
                    className="rounded-2xl border border-gray-200 bg-white px-2 dark:border-gray-700 dark:bg-gray-800"
                >
                    <AccordionTrigger className="px-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <div className="flex w-full items-center justify-between pr-2">
                            <span>フィルター</span>
                            {hasFilters && (
                                <span className="text-xs text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                                    {activeFilters.join("・")}
                                </span>
                            )}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-2">
                        <div className="flex flex-col gap-3 pt-2 pb-2">
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="メニュー名で検索"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 w-full h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs md:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                <SelectTrigger className="w-full h-10">
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
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/3">メニュー名</TableHead>
                            <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/3">カテゴリー</TableHead>
                            <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/3">金額</TableHead>
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
                                    <TableCell className="px-3 sm:px-4 text-center text-gray-900 dark:text-white">{menu.name}</TableCell>
                                    <TableCell className="px-3 sm:px-4 text-center">
                                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                            {menu.category?.name || "未分類"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-3 sm:px-4 text-center text-gray-900 dark:text-white">
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
            />

            <CategoryManageModal
                open={isCategoryModalOpen}
                onOpenChange={setIsCategoryModalOpen}
                categories={categories}
            />
        </div>
    );
}
