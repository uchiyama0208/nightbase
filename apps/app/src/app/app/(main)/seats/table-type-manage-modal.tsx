"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableType } from "@/types/floor";
import { createTableType, updateTableType, deleteTableType, updateTableTypeSortOrders } from "./actions";
import { Trash2, Edit2, Plus, ArrowUp, ArrowDown, X, Check, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface TableTypeManageModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tableTypes: TableType[];
    onUpdate?: () => void;
}

export function TableTypeManageModal({ open, onOpenChange, tableTypes, onUpdate }: TableTypeManageModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [newTypeName, setNewTypeName] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
    const router = useRouter();

    const handleCreate = async () => {
        if (!newTypeName.trim()) return;
        setIsSubmitting(true);
        try {
            const maxSortOrder = tableTypes.length > 0
                ? Math.max(...tableTypes.map(t => t.sort_order)) + 1
                : 0;
            await createTableType(newTypeName, maxSortOrder);
            setNewTypeName("");
            router.refresh();
            onUpdate?.();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return;
        setIsSubmitting(true);
        try {
            const tableType = tableTypes.find(t => t.id === id);
            await updateTableType(id, editName, tableType?.sort_order ?? 0);
            setEditingId(null);
            setEditName("");
            router.refresh();
            onUpdate?.();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        setIsSubmitting(true);
        try {
            await deleteTableType(id);
            setDeleteConfirm(null);
            router.refresh();
            onUpdate?.();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMove = async (index: number, direction: "up" | "down") => {
        if (direction === "up" && index === 0) return;
        if (direction === "down" && index === tableTypes.length - 1) return;

        const newTypes = [...tableTypes];
        const targetIndex = direction === "up" ? index - 1 : index + 1;

        // Swap
        [newTypes[index], newTypes[targetIndex]] = [newTypes[targetIndex], newTypes[index]];

        const updates = newTypes.map((type, idx) => ({
            id: type.id,
            sort_order: idx
        }));

        setIsSubmitting(true);
        try {
            await updateTableTypeSortOrders(updates);
            router.refresh();
            onUpdate?.();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEdit = (tableType: TableType) => {
        setEditingId(tableType.id);
        setEditName(tableType.name);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName("");
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(value) => { if (!value) onOpenChange(false); }}>
                <DialogContent
                    className="max-w-md p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl"
                    onPointerDownOutside={(e) => e.stopPropagation()}
                    onInteractOutside={(e) => e.stopPropagation()}
                    onEscapeKeyDown={(e) => e.stopPropagation()}
                >
                    <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">席タイプ管理</DialogTitle>
                        <DialogDescription className="sr-only">席タイプの追加・編集・削除</DialogDescription>
                        <div className="w-8 h-8" />
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {/* Create New */}
                        <div className="flex gap-2 items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <Input
                                placeholder="新しい席タイプ名"
                                value={newTypeName}
                                onChange={(e) => setNewTypeName(e.target.value)}
                                className="flex-1 h-10 rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCreate();
                                }}
                            />
                            <Button
                                size="sm"
                                onClick={handleCreate}
                                disabled={isSubmitting || !newTypeName.trim()}
                                className="h-10 px-4 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                            >
                                <Plus className="h-5 w-5 mr-1" />
                                追加
                            </Button>
                        </div>

                        {/* List */}
                        <div className="space-y-2">
                            {tableTypes.map((tableType, index) => (
                                <div
                                    key={tableType.id}
                                    className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    {/* Sort Controls */}
                                    <div className="flex flex-col gap-0.5">
                                        <button
                                            type="button"
                                            onClick={() => handleMove(index, "up")}
                                            disabled={index === 0 || isSubmitting}
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 p-0.5"
                                        >
                                            <ArrowUp className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMove(index, "down")}
                                            disabled={index === tableTypes.length - 1 || isSubmitting}
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 p-0.5"
                                        >
                                            <ArrowDown className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        {editingId === tableType.id ? (
                                            <div className="flex gap-2">
                                                <Input
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="h-10 rounded-lg"
                                                    autoFocus
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                                    onClick={() => handleUpdate(tableType.id)}
                                                >
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-9 w-9 text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                    onClick={cancelEdit}
                                                >
                                                    <X className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="text-sm font-medium text-gray-900 dark:text-white pl-2">{tableType.name}</span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {editingId !== tableType.id && (
                                        <div className="flex gap-1">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-9 w-9 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                onClick={() => startEdit(tableType)}
                                                disabled={isSubmitting}
                                            >
                                                <Edit2 className="h-5 w-5" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-9 w-9 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                onClick={() => setDeleteConfirm({ id: tableType.id, name: tableType.name })}
                                                disabled={isSubmitting}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {tableTypes.length === 0 && (
                                <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                                    席タイプがありません
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex-shrink-0 p-6 pt-0">
                        <Button
                            variant="outline"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenChange(false);
                            }}
                            className="w-full h-11 rounded-lg"
                        >
                            閉じる
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
                    <DialogHeader className="space-y-1.5">
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">削除確認</DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                            「{deleteConfirm?.name}」を削除しますか？紐づいているテーブルは席タイプなしになります。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col-reverse gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteConfirm(null)}
                            className="w-full h-11 rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteConfirm && handleDelete(deleteConfirm.id)}
                            disabled={isSubmitting}
                            className="w-full h-11 rounded-lg"
                        >
                            {isSubmitting ? "削除中..." : "削除"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
