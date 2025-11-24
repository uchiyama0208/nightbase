"use client";

import { useState } from "react";
import { Menu } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Search, Edit2 } from "lucide-react";
import { MenuEditModal } from "./menu-edit-modal";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface MenuListProps {
    initialMenus: Menu[];
    categories: string[];
}

export function MenuList({ initialMenus, categories }: MenuListProps) {
    const [menus, setMenus] = useState(initialMenus);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<Menu | null>(null);

    const filteredMenus = initialMenus.filter((menu) => {
        const matchesSearch = menu.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "all" || menu.category === selectedCategory;
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
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-[240px]">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="メニュー名で検索"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-full sm:w-[240px]">
                            <SelectValue placeholder="カテゴリー" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">すべてのカテゴリー</SelectItem>
                            {categories.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                    {cat}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={handleCreate} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    メニュー追加
                </Button>
            </div>

            <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <Table>
                    <TableHeader>
                        <TableRow className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <TableHead className="text-gray-500 dark:text-gray-400 text-center w-1/3">メニュー名</TableHead>
                            <TableHead className="text-gray-500 dark:text-gray-400 text-center w-1/3">カテゴリー</TableHead>
                            <TableHead className="text-gray-500 dark:text-gray-400 text-center w-1/3">金額</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredMenus.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-8 text-gray-500 dark:text-gray-400">
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
                                    <TableCell className="text-center text-gray-900 dark:text-white">{menu.name}</TableCell>
                                    <TableCell className="text-center">
                                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                            {menu.category}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center text-gray-900 dark:text-white">
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
        </div>
    );
}
