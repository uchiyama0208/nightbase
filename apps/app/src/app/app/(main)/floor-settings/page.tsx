"use client";

import { useState, useEffect, useRef } from "react";
import { Table } from "@/types/floor";
import { getTables, saveTable, deleteTable } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TableLayoutEditor } from "./table-layout-editor";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function FloorSettingsPage() {
    const [tables, setTables] = useState<Table[]>([]);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [editingLayoutTableId, setEditingLayoutTableId] = useState<string | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const { toast } = useToast();

    useEffect(() => {
        loadTables();
    }, []);

    const loadTables = async () => {
        const data = await getTables();
        setTables(data);
    };

    const handleAddTable = async () => {
        const newTable: Partial<Table> = {
            name: `T${tables.length + 1}`,
            x: 50,
            y: 50,
            width: 100,
            height: 100,
            shape: "rect",
            layout_data: { seats: [], objects: [] }
        };

        try {
            const result = await saveTable(newTable);
            if (result.success) {
                setTables([...tables, result.table]);
                toast({ title: "テーブルを追加しました" });
            }
        } catch (error) {
            toast({ title: "エラー", description: "テーブルの追加に失敗しました" });
        }
    };

    const handleUpdateTable = async (id: string, updates: Partial<Table>) => {
        // Optimistic update
        setTables(tables.map(t => t.id === id ? { ...t, ...updates } : t));

        // Debounce save in real implementation, direct save for now
        try {
            await saveTable({ id, ...updates });
        } catch (error) {
            // Revert on error (reload)
            loadTables();
        }
    };

    const handleDeleteTable = async (id: string) => {
        if (!confirm("このテーブルを削除しますか？")) return;

        try {
            await deleteTable(id);
            setTables(tables.filter(t => t.id !== id));
            setSelectedTableId(null);
            toast({ title: "テーブルを削除しました" });
        } catch (error) {
            toast({ title: "エラー", description: "テーブルの削除に失敗しました" });
        }
    };

    const handleSaveLayout = async (tableId: string, layoutData: any) => {
        await handleUpdateTable(tableId, { layout_data: layoutData });
        toast({ title: "座席配置を保存しました" });
    };

    const handleMouseDown = (e: React.MouseEvent, table: Table) => {
        e.stopPropagation();
        setSelectedTableId(table.id);
        setIsDragging(true);
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !selectedTableId) return;

        const container = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - container.left - dragOffset.current.x;
        const y = e.clientY - container.top - dragOffset.current.y;

        // Snap to grid (10px)
        const snappedX = Math.round(x / 10) * 10;
        const snappedY = Math.round(y / 10) * 10;

        setTables(tables.map(t =>
            t.id === selectedTableId ? { ...t, x: snappedX, y: snappedY } : t
        ));
    };

    const handleMouseUp = async () => {
        if (isDragging && selectedTableId) {
            const table = tables.find(t => t.id === selectedTableId);
            if (table) {
                await saveTable({ id: table.id, x: table.x, y: table.y });
            }
        }
        setIsDragging(false);
    };

    return (
        <div className="flex flex-col h-full p-4 gap-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">フロア設定</h1>
                <Button onClick={handleAddTable}>
                    <Plus className="mr-2 h-4 w-4" /> テーブル追加
                </Button>
            </div>

            <div className="flex flex-1 gap-4">
                {/* Canvas Area */}
                <div
                    className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-lg relative overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-700"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {tables.map(table => (
                        <div
                            key={table.id}
                            className={`absolute cursor-move flex items-center justify-center border-2 transition-colors ${selectedTableId === table.id
                                ? "border-primary bg-primary/20 z-10"
                                : "border-slate-400 bg-white dark:bg-slate-800"
                                }`}
                            style={{
                                left: table.x,
                                top: table.y,
                                width: table.width,
                                height: table.height,
                                borderRadius: table.shape === 'circle' ? '50%' : '8px'
                            }}
                            onMouseDown={(e) => handleMouseDown(e, table)}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTableId(table.id);
                            }}
                        >
                            <span className="font-bold select-none">{table.name}</span>
                            {/* Show seat count indicator */}
                            {table.layout_data?.seats?.length > 0 && (
                                <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                                    {table.layout_data.seats.length}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Properties Panel */}
                <div className="w-80 bg-card border rounded-lg p-4">
                    <h2 className="font-semibold mb-4">プロパティ</h2>
                    {selectedTableId ? (
                        <div className="space-y-4">
                            {tables.filter(t => t.id === selectedTableId).map(table => (
                                <div key={table.id} className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium">名前</label>
                                        <input
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={table.name}
                                            onChange={(e) => handleUpdateTable(table.id, { name: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-sm font-medium">幅</label>
                                            <input
                                                type="number"
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={table.width}
                                                onChange={(e) => handleUpdateTable(table.id, { width: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">高さ</label>
                                            <input
                                                type="number"
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={table.height}
                                                onChange={(e) => handleUpdateTable(table.id, { height: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">形状</label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={table.shape}
                                            onChange={(e) => handleUpdateTable(table.id, { shape: e.target.value as any })}
                                        >
                                            <option value="rect">四角形</option>
                                            <option value="circle">円形</option>
                                        </select>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => setEditingLayoutTableId(table.id)}
                                    >
                                        <Edit className="mr-2 h-4 w-4" /> 座席配置を編集
                                    </Button>

                                    <Button
                                        variant="destructive"
                                        className="w-full mt-4"
                                        onClick={() => handleDeleteTable(table.id)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" /> 削除
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-sm">
                            テーブルを選択してプロパティを編集
                        </p>
                    )}
                </div>
            </div>

            <TableLayoutEditor
                table={tables.find(t => t.id === editingLayoutTableId) || null}
                open={!!editingLayoutTableId}
                onOpenChange={(open) => !open && setEditingLayoutTableId(null)}
                onSave={handleSaveLayout}
            />
        </div>
    );
}
