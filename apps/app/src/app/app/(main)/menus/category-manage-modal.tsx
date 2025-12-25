"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MenuCategory, createMenuCategory, updateMenuCategory, deleteMenuCategory, reorderMenuCategories } from "./actions";
import { Trash2, Edit2, Plus, ArrowUp, ArrowDown, X, ChevronLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useGlobalLoading } from "@/components/global-loading";

interface CategoryManageModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: MenuCategory[];
}

export function CategoryManageModal({ open, onOpenChange, categories }: CategoryManageModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [newCategoryName, setNewCategoryName] = useState("");
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { showLoading, hideLoading } = useGlobalLoading();
    const initialEditNameRef = useRef<string>("");

    const handleCreate = async () => {
        if (!newCategoryName.trim()) return;
        setIsSubmitting(true);
        try {
            await createMenuCategory(newCategoryName);
            setNewCategoryName("");
            await queryClient.invalidateQueries({ queryKey: ["menus"] });
        } catch (error) {
            console.error(error);
            toast({
                title: "エラー",
                description: "カテゴリの作成に失敗しました",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // 自動保存関数
    const autoSave = useCallback(async (id: string, name: string) => {
        if (!name.trim()) return;
        showLoading("保存中...");
        try {
            await updateMenuCategory(id, name);
            await queryClient.invalidateQueries({ queryKey: ["menus"] });
        } catch (error) {
            console.error(error);
            toast({
                title: "エラー",
                description: "カテゴリの更新に失敗しました",
                variant: "destructive",
            });
        } finally {
            hideLoading();
        }
    }, [queryClient, toast, showLoading, hideLoading]);

    // デバウンス自動保存
    useEffect(() => {
        if (!editingId || !editName.trim()) return;
        // 初期値と同じ場合は保存しない
        if (editName === initialEditNameRef.current) return;

        const timer = setTimeout(() => {
            autoSave(editingId, editName);
            initialEditNameRef.current = editName;
        }, 800);

        return () => clearTimeout(timer);
    }, [editingId, editName, autoSave]);

    const handleDeleteClick = useCallback((id: string) => {
        setDeleteTargetId(id);
        setIsDeleteDialogOpen(true);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (!deleteTargetId) return;
        setIsSubmitting(true);
        try {
            await deleteMenuCategory(deleteTargetId);
            await queryClient.invalidateQueries({ queryKey: ["menus"] });
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
            setIsDeleteDialogOpen(false);
            setDeleteTargetId(null);
        }
    }, [deleteTargetId, queryClient]);

    const handleMove = async (index: number, direction: "up" | "down") => {
        if (direction === "up" && index === 0) return;
        if (direction === "down" && index === categories.length - 1) return;

        const newCategories = [...categories];
        const targetIndex = direction === "up" ? index - 1 : index + 1;

        // Swap
        [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];

        // Update sort orders locally to reflect immediately (optimistic UI could be better but simple swap is fine)
        // Actually we need to send the new order to server.
        // Let's just send the swapped items or all items with new indices.

        const updates = newCategories.map((cat, idx) => ({
            id: cat.id,
            sort_order: idx
        }));

        setIsSubmitting(true);
        try {
            await reorderMenuCategories(updates);
            await queryClient.invalidateQueries({ queryKey: ["menus"] });
        } catch (error) {
            console.error(error);
            toast({
                title: "エラー",
                description: "並び替えに失敗しました",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEdit = (category: MenuCategory) => {
        setEditingId(category.id);
        setEditName(category.name);
        initialEditNameRef.current = category.name;
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName("");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white max-h-[80vh] overflow-hidden flex flex-col p-0 rounded-2xl">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        カテゴリー管理
                    </DialogTitle>
                    <div className="w-8 h-8" />
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Create New */}
                    <div className="flex gap-2 items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <Input
                            placeholder="新しいカテゴリー名"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="flex-1"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreate();
                            }}
                        />
                        <Button
                            size="sm"
                            onClick={handleCreate}
                            disabled={isSubmitting || !newCategoryName.trim()}
                        >
                            <Plus className="h-5 w-5 mr-1" />
                            追加
                        </Button>
                    </div>

                    {/* List */}
                    <div className="space-y-2">
                        {categories.map((category, index) => (
                            <div
                                key={category.id}
                                className="flex items-center gap-2 p-2 border border-gray-100 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                                {/* Sort Controls */}
                                <div className="flex flex-col gap-0.5">
                                    <button
                                        type="button"
                                        onClick={() => handleMove(index, "up")}
                                        disabled={index === 0 || isSubmitting}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30"
                                    >
                                        <ArrowUp className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMove(index, "down")}
                                        disabled={index === categories.length - 1 || isSubmitting}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30"
                                    >
                                        <ArrowDown className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    {editingId === category.id ? (
                                        <div className="flex gap-2">
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="h-8"
                                                autoFocus
                                            />
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500" onClick={cancelEdit}>
                                                <X className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <span className="text-sm font-medium pl-2">{category.name}</span>
                                    )}
                                </div>

                                {/* Actions */}
                                {editingId !== category.id && (
                                    <div className="flex gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-gray-500 hover:text-blue-600"
                                            onClick={() => startEdit(category)}
                                            disabled={isSubmitting}
                                        >
                                            <Edit2 className="h-5 w-5" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-gray-500 hover:text-red-600"
                                            onClick={() => handleDeleteClick(category.id)}
                                            disabled={isSubmitting}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {categories.length === 0 && (
                            <div className="text-center text-sm text-gray-500 py-4">
                                カテゴリーがありません
                            </div>
                        )}
                    </div>
                </div>

            </DialogContent>

            {/* 削除確認ダイアログ */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">カテゴリの削除</DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                            このカテゴリを削除しますか？紐づいているメニューはカテゴリなしになります。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={isSubmitting}
                            className="rounded-lg"
                        >
                            {isSubmitting ? "削除中..." : "削除する"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
