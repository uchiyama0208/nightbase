"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, Search, Check, ChevronRight } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SalarySystem {
    id: string;
    name: string;
    target_type: string;
}

interface SalarySystemSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    salarySystems: SalarySystem[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onSave: () => void;
    onOpenDetail: (system: SalarySystem) => void;
    className?: string;
}

export function SalarySystemSelectorModal({
    isOpen,
    onClose,
    salarySystems,
    selectedId,
    onSelect,
    onSave,
    onOpenDetail,
    className,
}: SalarySystemSelectorModalProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredSystems = useMemo(() => {
        if (!searchQuery.trim()) return salarySystems;
        const query = searchQuery.toLowerCase();
        return salarySystems.filter(system =>
            system.name.toLowerCase().includes(query)
        );
    }, [salarySystems, searchQuery]);

    const handleSelect = (id: string) => {
        // Toggle: 同じものをクリックしたら解除、違うものなら選択
        if (selectedId === id) {
            onSelect(null);
        } else {
            onSelect(id);
        }
    };

    const handleSave = () => {
        onSave();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={cn("max-w-md max-h-[80vh] flex flex-col p-0", className)}>
                <div className="flex-1 overflow-y-auto min-h-0">
                    <DialogHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
                        <Button variant="ghost" size="icon" className="-ml-2" onClick={onClose}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                            給与システムを選択
                        </DialogTitle>
                        <div className="w-10" />
                    </DialogHeader>

                    <div className="px-4 py-3 border-b">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="給与システムを検索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-10"
                            />
                        </div>
                    </div>

                    <div className="px-4 py-2">
                        {filteredSystems.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                {searchQuery ? "該当する給与システムがありません" : "給与システムがありません"}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredSystems.map((system) => {
                                    const isSelected = selectedId === system.id;
                                    return (
                                        <div
                                            key={system.id}
                                            className={`flex items-center rounded-lg border transition-colors ${
                                                isSelected
                                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                                    : "border-gray-200 dark:border-gray-700"
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleSelect(system.id)}
                                                className="flex-1 flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-l-lg transition-colors"
                                            >
                                                <span className={`text-sm ${isSelected ? "text-blue-700 dark:text-blue-300 font-medium" : "text-gray-900 dark:text-white"}`}>
                                                    {system.name}
                                                </span>
                                                {isSelected && (
                                                    <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onOpenDetail(system)}
                                                className="px-3 py-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-lg transition-colors border-l border-gray-200 dark:border-gray-700"
                                            >
                                                <ChevronRight className="h-5 w-5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="border-t px-4 py-3 flex-shrink-0 space-y-2">
                    <Button
                        onClick={handleSave}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        保存
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="w-full"
                    >
                        キャンセル
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
