"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MoreHorizontal, ChevronLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createMenu, updateMenu, deleteMenu, Menu, MenuCategory, createMenuCategory } from "./actions";
import { useRouter } from "next/navigation";

interface MenuEditModalProps {
    menu: Menu | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: MenuCategory[];
}

export function MenuEditModal({ menu, open, onOpenChange, categories }: MenuEditModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [categoryMode, setCategoryMode] = useState<"select" | "create">("select");
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [newCategoryName, setNewCategoryName] = useState("");
    const [showActions, setShowActions] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (open) {
            if (menu) {
                setSelectedCategoryId(menu.category_id);
                setCategoryMode("select");
                setNewCategoryName("");
            } else {
                setSelectedCategoryId("");
                setNewCategoryName("");
                setCategoryMode(categories.length > 0 ? "select" : "create");
            }
        }
    }, [open, menu, categories]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);

        try {
            // カテゴリーの処理
            let categoryId = "";
            if (categoryMode === "create") {
                if (!newCategoryName.trim()) {
                    alert("カテゴリー名を入力してください");
                    setIsSubmitting(false);
                    return;
                }
                // Create new category first
                const result = await createMenuCategory(newCategoryName);
                if (result.success && result.category) {
                    categoryId = result.category.id;
                } else {
                    throw new Error("Failed to create category");
                }
            } else {
                categoryId = selectedCategoryId;
            }

            if (!categoryId) {
                alert("カテゴリーを選択してください");
                setIsSubmitting(false);
                return;
            }
            formData.set("category_id", categoryId);

            if (menu) {
                formData.append("id", menu.id);
                await updateMenu(formData);
            } else {
                await createMenu(formData);
            }
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            console.error("Failed to save menu:", error);
            alert("メニューの保存に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!menu) return;

        setIsSubmitting(true);
        try {
            await deleteMenu(menu.id);
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            console.error("Failed to delete menu:", error);
            alert("削除に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800 w-[95%] rounded-lg max-h-[90vh] overflow-y-auto p-6 text-gray-900 dark:text-gray-100">
                <DialogHeader className="flex flex-row items-center justify-between gap-2 relative">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-0"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-xl font-bold text-gray-900 dark:text-white truncate">
                        {menu ? "メニュー編集" : "メニュー追加"}
                    </DialogTitle>
                    {menu ? (
                        <button
                            type="button"
                            onClick={() => setShowActions(!showActions)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                            aria-label="オプション"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                    ) : (
                        <div className="w-8 h-8" />
                    )}

                    {showActions && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                            <div className="absolute right-0 top-10 z-50 w-40 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-2 flex flex-col gap-1 text-sm animate-in fade-in zoom-in-95 duration-100">
                                <button
                                    type="button"
                                    className="w-full text-left px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                                    onClick={() => {
                                        setShowActions(false);
                                        handleDelete();
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    削除
                                </button>
                            </div>
                        </>
                    )}
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">メニュー名</Label>
                        <Input
                            id="name"
                            name="name"
                            defaultValue={menu?.name || ""}
                            placeholder="例: 生ビール"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>カテゴリー</Label>
                        <div className="inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-700 p-1 w-full">
                            <button
                                type="button"
                                onClick={() => setCategoryMode("select")}
                                disabled={categories.length === 0}
                                className={`flex-1 h-full flex items-center justify-center rounded-full text-sm font-medium transition-colors ${categoryMode === "select"
                                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                既存から選択
                            </button>
                            <button
                                type="button"
                                onClick={() => setCategoryMode("create")}
                                className={`flex-1 h-full flex items-center justify-center rounded-full text-sm font-medium transition-colors ${categoryMode === "create"
                                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                    }`}
                            >
                                新規作成
                            </button>
                        </div>

                        {categoryMode === "select" ? (
                            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="カテゴリーを選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="新しいカテゴリー名"
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="price">金額 (円)</Label>
                        <Input
                            id="price"
                            name="price"
                            type="number"
                            defaultValue={menu?.price !== undefined ? menu.price : ""}
                            placeholder="1000"
                            required
                            min="0"
                        />
                    </div>

                    <DialogFooter className="flex-col sm:flex-col gap-3">
                        <Button type="submit" disabled={isSubmitting} className="h-11 w-full">
                            {isSubmitting ? "保存中..." : "保存"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 w-full">
                            キャンセル
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
