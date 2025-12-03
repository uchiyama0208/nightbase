"use client";

import { useState, useEffect } from "react";
import { Table, TableType, PricingSystem } from "@/types/floor";
import { getTables, createTable, updateTable, deleteTable, getTableTypes } from "./actions";
import { getPricingSystems } from "@/app/app/(main)/pricing-systems/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TableTypeManageModal } from "./table-type-manage-modal";

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
            <Label>机の配置をクリックしてください</Label>
            <div className="inline-block border-2 border-gray-300 rounded-lg overflow-hidden">
                {grid.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex">
                        {row.map((cell, colIndex) => (
                            <button
                                key={colIndex}
                                type="button"
                                onClick={() => toggleCell(rowIndex, colIndex)}
                                className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 border border-gray-200 transition-colors ${cell
                                    ? "bg-green-400 hover:bg-green-500"
                                    : "bg-white hover:bg-gray-100"
                                    }`}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function SeatsEditorPage() {
    const [tables, setTables] = useState<Table[]>([]);
    const [tableTypes, setTableTypes] = useState<TableType[]>([]);
    const [pricingSystems, setPricingSystems] = useState<PricingSystem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
    const [editingTable, setEditingTable] = useState<Table | null>(null);
    const [deletingTableId, setDeletingTableId] = useState<string | null>(null);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        name: "",
        type_id: "" as string | null,
        pricing_system_id: "" as string | null,
        grid: Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false)),
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [tablesData, typesData, pricingSystemsData] = await Promise.all([
            getTables(),
            getTableTypes(),
            getPricingSystems()
        ]);
        setTables(tablesData);
        setTableTypes(typesData as TableType[]);
        setPricingSystems(pricingSystemsData);
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
                pricing_system_id: table.pricing_system_id || "",
                grid: grid,
            });
        } else {
            setEditingTable(null);
            // デフォルトの料金システムを取得
            const defaultPricingSystem = pricingSystems.find(ps => ps.is_default);
            setFormData({
                name: "",
                type_id: "",
                pricing_system_id: defaultPricingSystem?.id || "",
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
                    pricing_system_id: formData.pricing_system_id || null,
                    layout_data: layoutData,
                });
                toast({ title: "テーブルを更新しました" });
            } else {
                await createTable({
                    name: formData.name,
                    type_id: formData.type_id || null,
                    pricing_system_id: formData.pricing_system_id || null,
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
        if (!grid || grid.length === 0) return <span className="text-muted-foreground">未設定</span>;

        return (
            <div className="inline-block border border-gray-300 rounded">
                {grid.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex">
                        {row.map((cell, colIndex) => (
                            <div
                                key={colIndex}
                                className={`w-3 h-3 border border-gray-200 ${cell ? "bg-green-400" : "bg-white"}`}
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
            <div className="p-4 border-b flex justify-between items-center">
                <h1 className="text-xl font-bold">席エディター</h1>
                <Button onClick={() => handleOpenModal()} size="icon">
                    <Plus className="h-5 w-5" />
                </Button>
            </div>

            {/* Table Grid */}
            <div className="flex-1 overflow-auto p-6">
                {tables.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-muted-foreground">
                            <p className="mb-4">テーブルがありません</p>
                            <Button onClick={() => handleOpenModal()}>
                                <Plus className="h-4 w-4 mr-2" />
                                最初のテーブルを追加
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {tables.map((table) => (
                            <Card
                                key={table.id}
                                className="cursor-pointer shadow-sm hover:shadow-md transition-shadow border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
                                onClick={() => handleOpenModal(table)}
                            >
                                <CardContent className="px-2 py-1">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <h3 className="font-semibold text-xl text-center">
                                            {table.name}
                                        </h3>
                                        <div className="bg-gray-50 dark:bg-gray-900 p-1 rounded">
                                            {renderGridPreview(table.layout_data?.grid)}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
                    {/* Custom Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsModalOpen(false)}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="m15 18-6-6 6-6" />
                            </svg>
                        </Button>
                        <DialogTitle className="text-lg font-semibold">
                            {editingTable ? "テーブル編集" : "テーブル追加"}
                        </DialogTitle>
                        {editingTable ? (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteModal(editingTable.id)}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="12" cy="12" r="1" />
                                    <circle cx="12" cy="5" r="1" />
                                    <circle cx="12" cy="19" r="1" />
                                </svg>
                            </Button>
                        ) : (
                            <div className="w-10" />
                        )}
                    </div>

                    <div className="space-y-4 p-6">
                        <div className="space-y-2">
                            <Label>テーブル名 *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                                }
                                placeholder="例: テーブル 1"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>席タイプ</Label>
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
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
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
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>料金システム</Label>
                                <button
                                    type="button"
                                    onClick={() => window.open('/app/pricing-systems', '_blank')}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                    <Plus className="h-3 w-3" />
                                    料金システム追加
                                </button>
                            </div>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                                value={formData.pricing_system_id || ""}
                                onChange={(e) => setFormData((prev) => ({ ...prev, pricing_system_id: e.target.value || null }))}
                            >
                                <option value="">デフォルト</option>
                                {pricingSystems.map((system) => (
                                    <option key={system.id} value={system.id}>
                                        {system.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <GridEditor
                            grid={formData.grid}
                            onChange={(grid) => setFormData((prev) => ({ ...prev, grid }))}
                        />
                    </div>
                    <div className="p-6 pt-0">
                        <Button
                            className="w-full"
                            onClick={handleSave}
                            disabled={!formData.name}
                            size="lg"
                        >
                            {editingTable ? "更新" : "追加"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>削除確認</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p>このテーブルを削除しますか？</p>
                    </div>
                    <DialogFooter className="flex flex-col-reverse gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="w-full h-11"
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deletingTableId && handleDelete(deletingTableId)}
                            className="w-full h-11"
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
