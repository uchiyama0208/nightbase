"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableType, PricingSystem } from "@/types/floor";
import { createSession } from "./actions/session";
import { getTableTypes } from "../seats/actions";
import { getPricingSystems } from "../pricing-systems/actions";
import { useToast } from "@/components/ui/use-toast";

interface NewSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    tables: Table[];
    onSessionCreated: (sessionId?: string) => void;
}

export function NewSessionModal({ isOpen, onClose, tables, onSessionCreated }: NewSessionModalProps) {
    const [selectedTableId, setSelectedTableId] = useState<string>("");
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [selectedPricingSystemId, setSelectedPricingSystemId] = useState<string>("");
    const [tableTypes, setTableTypes] = useState<TableType[]>([]);
    const [pricingSystems, setPricingSystems] = useState<PricingSystem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            getTableTypes().then((types) => setTableTypes(types as TableType[]));
            getPricingSystems().then((systems) => {
                setPricingSystems(systems);
                // Set default pricing system
                const defaultSystem = systems.find(s => s.is_default);
                if (defaultSystem) {
                    setSelectedPricingSystemId(defaultSystem.id);
                } else if (systems.length > 0) {
                    setSelectedPricingSystemId(systems[0].id);
                }
            });
        }
    }, [isOpen]);

    const filteredTables = useMemo(() => {
        if (selectedTypeId === null) return tables;
        if (selectedTypeId === "none") return tables.filter(t => !t.type_id);
        return tables.filter(t => t.type_id === selectedTypeId);
    }, [tables, selectedTypeId]);
    const handleCreate = async (tableId?: string | null) => {
        setIsLoading(true);
        try {
            const session = await createSession(tableId || null, undefined, selectedPricingSystemId || undefined);
            toast({ title: "セッションを開始しました" });
            onSessionCreated(session.id);
            onClose();
            // Reset form
            setSelectedTableId("");
            setSelectedPricingSystemId("");
        } catch (error) {
            console.error(error);
            toast({ title: "開始に失敗しました" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>新規セッション開始</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {/* 料金システム選択 */}
                    {pricingSystems.length > 0 && (
                        <div className="space-y-2">
                            <Label>料金システム</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={selectedPricingSystemId}
                                onChange={(e) => setSelectedPricingSystemId(e.target.value)}
                            >
                                {pricingSystems.map((system) => (
                                    <option key={system.id} value={system.id}>
                                        {system.name}{system.is_default ? " (デフォルト)" : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* 席タイプフィルタ */}
                    {tableTypes.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedTypeId(null)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedTypeId === null
                                    ? "bg-blue-500 text-white"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    }`}
                            >
                                すべて
                            </button>
                            {tableTypes.map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setSelectedTypeId(type.id)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedTypeId === type.id
                                        ? "bg-blue-500 text-white"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                        }`}
                                >
                                    {type.name}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setSelectedTypeId("none")}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedTypeId === "none"
                                    ? "bg-blue-500 text-white"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    }`}
                            >
                                未分類
                            </button>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>テーブル選択</Label>
                        <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                            {filteredTables.map((table) => (
                                <button
                                    key={table.id}
                                    type="button"
                                    onClick={() => handleCreate(table.id)}
                                    disabled={isLoading}
                                    className="px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 bg-white dark:bg-slate-900 disabled:opacity-50"
                                >
                                    {table.name}
                                </button>
                            ))}
                            {filteredTables.length === 0 && (
                                <div className="col-span-2 text-center py-4 text-sm text-slate-500">
                                    該当するテーブルがありません
                                </div>
                            )}
                        </div>
                    </div>
                    <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => handleCreate(null)}
                        disabled={isLoading}
                    >
                        スキップ
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
