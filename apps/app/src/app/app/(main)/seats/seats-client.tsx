"use client";

import { useState, useEffect } from "react";
import { Table, TableType } from "@/types/floor";
import { getTables, createTable, updateTable, deleteTable, getTableTypes } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, ChevronLeft, Trash2 } from "lucide-react";
import { TableTypeManageModal } from "./table-type-manage-modal";
import { CommentSection } from "@/components/comment-section";

const GRID_SIZE = 8;

// Grid component for table shape editor
function GridEditor({ grid, onChange }: { grid: boolean[][]; onChange: (grid: boolean[][]) => void }) {
    const toggleCell = (row: number, col: number) => {
        const newGrid = grid.map((r, i) =>
            r.map((c, j) => (i === row && j === col ? !c : c))
        );
        onChange(newGrid);
    };

    return (
        <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">机の配置をクリックしてください</Label>
            <div className="flex justify-center">
                <div className="inline-block border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    {grid.map((row, rowIndex) => (
                        <div key={rowIndex} className="flex">
                            {row.map((cell, colIndex) => (
                                <button
                                    key={colIndex}
                                    type="button"
                                    onClick={() => toggleCell(rowIndex, colIndex)}
                                    className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 border border-gray-100 dark:border-gray-800 transition-colors ${cell
                                        ? "bg-blue-500 hover:bg-blue-600"
                                        : "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        }`}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

interface SeatsClientProps {
    canEdit?: boolean;
}

export function SeatsClient({ canEdit = false }: SeatsClientProps) {
    const [tables, setTables] = useState<Table[]>([]);
    const [tableTypes, setTableTypes] = useState<TableType[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
    const [editingTable, setEditingTable] = useState<Table | null>(null);
    const [deletingTableId, setDeletingTableId] = useState<string | null>(null);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        name: "",
        type_id: "" as string | null,
        grid: Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false)),
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [tablesData, typesData] = await Promise.all([
            getTables(),
            getTableTypes(),
        ]);
        setTables(tablesData);
        setTableTypes(typesData as TableType[]);
    };

    const loadTables = async () => {
        const data = await getTables();
        setTables(data);
    };

    const handleOpenModal = (table?: Table) => {
        if (table) {
            setEditingTable(table);
            const grid = table.layout_data?.grid || Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
            setFormData({
                name: table.name,
                type_id: table.type_id || "",
                grid: grid,
            });
        } else {
            setEditingTable(null);
            setFormData({
                name: "",
                type_id: "",
                grid: Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false)),
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const layoutData = {
                grid: formData.grid,
                seats: [],
                objects: [],
            };

            if (editingTable) {
                await updateTable(editingTable.id, {
                    name: formData.name,
                    type_id: formData.type_id || null,
                    layout_data: layoutData,
                });
                toast({ title: "テーブルを更新しました" });
            } else {
                await createTable({
                    name: formData.name,
                    type_id: formData.type_id || null,
                    x: 100,
                    y: 100,
                    width: 120,
                    height: 80,
                    shape: "rect",
                    rotation: 0,
                });
                const newTables = await getTables();
                const newTable = newTables[newTables.length - 1];
                if (newTable) {
                    await updateTable(newTable.id, {
                        layout_data: layoutData,
                    });
                }
                toast({ title: "テーブルを追加しました" });
            }
            await loadTables();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Failed to save table:", error);
            toast({ title: "保存に失敗しました" });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteTable(id);
            await loadTables();
            setIsDeleteModalOpen(false);
            setDeletingTableId(null);
            setIsModalOpen(false);
            toast({ title: "テーブルを削除しました" });
        } catch (error) {
            console.error("Failed to delete table:", error);
            toast({ title: "削除に失敗しました" });
        }
    };

    const openDeleteModal = (id: string) => {
        setDeletingTableId(id);
        setIsDeleteModalOpen(true);
    };

    // Render grid preview with borders
    const renderGridPreview = (grid: boolean[][] | undefined) => {
        if (!grid || grid.length === 0) return <span className="text-gray-500 dark:text-gray-400">未設定</span>;

        return (
            <div className="inline-block border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                {grid.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex">
                        {row.map((cell, colIndex) => (
                            <div
                                key={colIndex}
                                className={`w-3 h-3 border border-gray-100 dark:border-gray-800 ${cell ? "bg-blue-500" : "bg-white dark:bg-gray-900"}`}
                            />
                        ))}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            {canEdit && (
                <div className="flex justify-end items-center mb-4">
                    <Button
                        onClick={() => handleOpenModal()}
                        size="icon"
                        className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
            )}

            {/* Table Grid */}
            <div className="flex-1 overflow-auto">
                {tables.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-500 dark:text-gray-400">
                            <p className="mb-4">テーブルがありません</p>
                            <Button onClick={() => handleOpenModal()} className="bg-blue-600 text-white hover:bg-blue-700">
                                <Plus className="h-5 w-5 mr-2" />
                                最初のテーブルを追加
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {tables.map((table) => (
                            <div
                                key={table.id}
                                className="cursor-pointer bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:shadow-md transition-all"
                                onClick={() => handleOpenModal(table)}
                            >
                                <div className="flex flex-col items-center gap-3">
                                    <h3 className="font-semibold text-base text-gray-900 dark:text-white text-center">
                                        {table.name}
                                    </h3>
                                    {renderGridPreview(table.layout_data?.grid)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    {/* Custom Header */}
                    <DialogHeader className="flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] border-b border-gray-200 dark:border-gray-700 px-4 flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-0"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-bold text-gray-900 dark:text-white">
                            {editingTable ? "テーブル編集" : "テーブル追加"}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {editingTable ? "テーブルを編集" : "新しいテーブルを追加"}
                        </DialogDescription>
                        {editingTable ? (
                            <button
                                type="button"
                                onClick={() => openDeleteModal(editingTable.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 focus-visible:outline-none focus-visible:ring-0"
                                aria-label="削除"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        ) : (
                            <div className="w-8" />
                        )}
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">テーブル名 *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                                }
                                placeholder="例: テーブル 1"
                                className="h-11 rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-base focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">席タイプ</Label>
                                <button
                                    type="button"
                                    onClick={() => setIsTypeModalOpen(true)}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                    <Plus className="h-3 w-3" />
                                    席タイプ追加
                                </button>
                            </div>
                            <select
                                className="flex h-11 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.type_id || ""}
                                onChange={(e) => setFormData((prev) => ({ ...prev, type_id: e.target.value || null }))}
                            >
                                <option value="">なし</option>
                                {tableTypes.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <GridEditor
                            grid={formData.grid}
                            onChange={(grid) => setFormData((prev) => ({ ...prev, grid }))}
                        />

                        {/* Comments Section (only for existing tables) */}
                        {editingTable && (
                            <CommentSection
                                targetType="table"
                                targetId={editingTable.id}
                                isOpen={isModalOpen}
                            />
                        )}
                    </div>
                    <div className="flex-shrink-0 px-6 pb-6 space-y-2">
                            <Button
                                className="w-full h-11 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                                onClick={handleSave}
                                disabled={!formData.name}
                            >
                                {editingTable ? "更新" : "追加"}
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full h-11 rounded-lg"
                                onClick={() => setIsModalOpen(false)}
                            >
                                キャンセル
                            </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
                    <DialogHeader className="space-y-1.5">
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">削除確認</DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                            このテーブルを削除しますか？この操作は取り消せません。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col-reverse gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="w-full h-11 rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deletingTableId && handleDelete(deletingTableId)}
                            className="w-full h-11 rounded-lg"
                        >
                            削除
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Table Type Management Modal */}
            <TableTypeManageModal
                open={isTypeModalOpen}
                onOpenChange={setIsTypeModalOpen}
                tableTypes={tableTypes}
                onUpdate={loadData}
            />
        </div>
    );
}
