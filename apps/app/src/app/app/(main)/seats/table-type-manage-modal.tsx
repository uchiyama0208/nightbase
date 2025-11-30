"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableType } from "@/types/floor";
import { createTableType, updateTableType, deleteTableType, updateTableTypeSortOrders } from "./actions";
import { Trash2, Edit2, Plus, ArrowUp, ArrowDown, X, Check } from "lucide-react";
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
            alert("席タイプの作成に失敗しました");
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
            alert("席タイプの更新に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("この席タイプを削除しますか？\n紐づいているテーブルは席タイプなしになります。")) return;
        setIsSubmitting(true);
        try {
            await deleteTableType(id);
            router.refresh();
            onUpdate?.();
        } catch (error) {
            console.error(error);
            alert("席タイプの削除に失敗しました");
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
            alert("並び替えに失敗しました");
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
        <Dialog open={open} onOpenChange={(value) => { if (!value) onOpenChange(false); }}>
            <DialogContent 
                className="sm:max-w-[500px] bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-h-[80vh] overflow-hidden flex flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800"
                onPointerDownOutside={(e) => e.stopPropagation()}
                onInteractOutside={(e) => e.stopPropagation()}
                onEscapeKeyDown={(e) => e.stopPropagation()}
            >
                <DialogHeader>
                    <DialogTitle>席タイプ管理</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {/* Create New */}
                    <div className="flex gap-2 items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <Input
                            placeholder="新しい席タイプ名"
                            value={newTypeName}
                            onChange={(e) => setNewTypeName(e.target.value)}
                            className="flex-1"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreate();
                            }}
                        />
                        <Button
                            size="sm"
                            onClick={handleCreate}
                            disabled={isSubmitting || !newTypeName.trim()}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            追加
                        </Button>
                    </div>

                    {/* List */}
                    <div className="space-y-2">
                        {tableTypes.map((tableType, index) => (
                            <div
                                key={tableType.id}
                                className="flex items-center gap-2 p-2 border border-slate-100 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                                {/* Sort Controls */}
                                <div className="flex flex-col gap-0.5">
                                    <button
                                        type="button"
                                        onClick={() => handleMove(index, "up")}
                                        disabled={index === 0 || isSubmitting}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30"
                                    >
                                        <ArrowUp className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMove(index, "down")}
                                        disabled={index === tableTypes.length - 1 || isSubmitting}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30"
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
                                                className="h-8"
                                                autoFocus
                                            />
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleUpdate(tableType.id)}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500" onClick={cancelEdit}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <span className="text-sm font-medium pl-2">{tableType.name}</span>
                                    )}
                                </div>

                                {/* Actions */}
                                {editingId !== tableType.id && (
                                    <div className="flex gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-slate-500 hover:text-blue-600"
                                            onClick={() => startEdit(tableType)}
                                            disabled={isSubmitting}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-slate-500 hover:text-red-600"
                                            onClick={() => handleDelete(tableType.id)}
                                            disabled={isSubmitting}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {tableTypes.length === 0 && (
                            <div className="text-center text-sm text-slate-500 py-4">
                                席タイプがありません
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button 
                        variant="outline" 
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenChange(false);
                        }} 
                        className="w-full h-11"
                    >
                        閉じる
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
