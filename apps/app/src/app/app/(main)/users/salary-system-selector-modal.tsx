"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, Search, Check, ChevronRight } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGlobalLoading } from "@/components/global-loading";
import { toast } from "@/components/ui/use-toast";

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
    onSelect: (id: string | null) => Promise<void>;
    onOpenDetail: (system: SalarySystem) => void;
    className?: string;
}

export function SalarySystemSelectorModal({
    isOpen,
    onClose,
    salarySystems,
    selectedId,
    onSelect,
    onOpenDetail,
    className,
}: SalarySystemSelectorModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const { showLoading, hideLoading } = useGlobalLoading();

    const filteredSystems = useMemo(() => {
        if (!searchQuery.trim()) return salarySystems;
        const query = searchQuery.toLowerCase();
        return salarySystems.filter(system =>
            system.name.toLowerCase().includes(query)
        );
    }, [salarySystems, searchQuery]);

    const handleSelect = async (id: string) => {
        // Toggle: 同じものをクリックしたら解除、違うものなら選択
        const newId = selectedId === id ? null : id;
        showLoading("保存中...");
        try {
            await onSelect(newId);
            onClose();
        } catch {
            toast({
                title: "エラー",
                description: "保存に失敗しました",
                variant: "destructive",
            });
        } finally {
            hideLoading();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={cn("p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl", className)}>
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        給与システムを選択
                    </DialogTitle>
                    <div className="w-8 h-8" />
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-4">
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
                                            className="flex-1 flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-l-lg transition-colors"
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
                                            className="px-3 py-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-r-lg transition-colors border-l border-gray-200 dark:border-gray-700"
                                        >
                                            <ChevronRight className="h-5 w-5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
