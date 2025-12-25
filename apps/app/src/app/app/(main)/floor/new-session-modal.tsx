"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableType, PricingSystem } from "@/types/floor";
import { getTableTypes } from "../seats/actions";
import { getPricingSystems } from "../pricing-systems/actions";
import { useToast } from "@/components/ui/use-toast";
import { useCreateSession } from "./hooks/mutations";

// キャッシュ（コンポーネント外で保持）
let cachedTableTypes: TableType[] | null = null;
let cachedPricingSystems: PricingSystem[] | null = null;
let cachedDefaultPricingSystemId: string | null = null;

interface NewSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    tables: Table[];
    onSessionCreated: (sessionId?: string) => void;
}

export function NewSessionModal({ isOpen, onClose, tables, onSessionCreated }: NewSessionModalProps) {
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [selectedPricingSystemId, setSelectedPricingSystemId] = useState<string>(cachedDefaultPricingSystemId || "");
    const [tableTypes, setTableTypes] = useState<TableType[]>(cachedTableTypes || []);
    const [pricingSystems, setPricingSystems] = useState<PricingSystem[]>(cachedPricingSystems || []);
    const { toast } = useToast();
    const isInitializedRef = useRef(false);
    const createSessionMutation = useCreateSession();

    useEffect(() => {
        if (isOpen && !isInitializedRef.current) {
            isInitializedRef.current = true;

            // キャッシュがなければ取得
            if (!cachedTableTypes) {
                getTableTypes().then((types) => {
                    cachedTableTypes = types as TableType[];
                    setTableTypes(cachedTableTypes);
                });
            }

            if (!cachedPricingSystems) {
                getPricingSystems().then((systems) => {
                    cachedPricingSystems = systems;
                    setPricingSystems(systems);
                    // Set default pricing system
                    const defaultSystem = systems.find(s => s.is_default);
                    if (defaultSystem) {
                        cachedDefaultPricingSystemId = defaultSystem.id;
                        setSelectedPricingSystemId(defaultSystem.id);
                    } else if (systems.length > 0) {
                        cachedDefaultPricingSystemId = systems[0].id;
                        setSelectedPricingSystemId(systems[0].id);
                    }
                });
            }
        }
    }, [isOpen]);

    const filteredTables = useMemo(() => {
        if (selectedTypeId === null) return tables;
        if (selectedTypeId === "none") return tables.filter(t => !t.type_id);
        return tables.filter(t => t.type_id === selectedTypeId);
    }, [tables, selectedTypeId]);

    const handleCreate = (tableId?: string | null) => {
        // モーダルを閉じる
        onClose();

        // ミューテーションでセッション作成（楽観的UI + Realtime）
        createSessionMutation.mutate(
            {
                tableId: tableId || null,
                pricingSystemId: selectedPricingSystemId || undefined,
            },
            {
                onSuccess: (session) => {
                    onSessionCreated(session.id);
                },
                onError: (error) => {
                    console.error(error);
                    toast({ title: "開始に失敗しました", variant: "destructive" });
                    onSessionCreated();
                },
            }
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md w-[95%] p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl bg-white dark:bg-gray-900">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        新規セッション開始
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        新しいセッションを開始します
                    </DialogDescription>
                    <div className="w-8 h-8" />
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* 料金システム選択 */}
                    {pricingSystems.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">料金システム</Label>
                            <select
                                className="flex h-10 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
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
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
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
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
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
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                    }`}
                            >
                                未分類
                            </button>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">テーブル選択</Label>
                        <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                            {filteredTables.map((table) => (
                                <button
                                    key={table.id}
                                    type="button"
                                    onClick={() => handleCreate(table.id)}
                                    className="px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 bg-white dark:bg-gray-900"
                                >
                                    {table.name}
                                </button>
                            ))}
                            {filteredTables.length === 0 && (
                                <div className="col-span-2 text-center py-4 text-sm text-gray-500">
                                    該当するテーブルがありません
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex-shrink-0 px-6 pb-6 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => handleCreate(null)}
                    >
                        スキップ
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
