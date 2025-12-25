"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Calendar, Filter, Search, ChevronLeft } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { SalarySystem } from "./actions";
import { VercelTabs } from "@/components/ui/vercel-tabs";

// Lazy load the modal
const SalarySystemModal = dynamic(
    () => import("./salary-system-modal").then(mod => ({ default: mod.SalarySystemModal })),
    { loading: () => null, ssr: false }
);

interface SalarySystemsListProps {
    initialSystems: SalarySystem[];
    typeFilter: string;
    storeShowBreakColumns: boolean;
    storeTimeRoundingEnabled: boolean;
    storeTimeRoundingMinutes: number;
    canEdit?: boolean;
}

type TabType = "cast" | "staff";

export function SalarySystemsList({ initialSystems, typeFilter, storeShowBreakColumns, storeTimeRoundingEnabled, storeTimeRoundingMinutes, canEdit = false }: SalarySystemsListProps) {
    const router = useRouter();
    const [systems, setSystems] = useState(initialSystems);
    const [selectedSystem, setSelectedSystem] = useState<SalarySystem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [nameQuery, setNameQuery] = useState("");
    const [optimisticType, setOptimisticType] = useState<TabType>(typeFilter as TabType);
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

    useEffect(() => {
        setSystems(initialSystems);
    }, [initialSystems]);

    useEffect(() => {
        setOptimisticType(typeFilter as TabType);
    }, [typeFilter]);

    const handleTypeChange = (type: TabType) => {
        setOptimisticType(type);
        router.push(`/app/salary-systems?type=${type}`);
    };

    const activeFilters = useMemo(() => [
        nameQuery.trim() && `"${nameQuery}"`,
    ].filter(Boolean) as string[], [nameQuery]);
    const hasFilters = activeFilters.length > 0;

    const getFilterSummary = useCallback(() => {
        if (!hasFilters) return "なし";
        return activeFilters.join("・");
    }, [hasFilters, activeFilters]);

    const filteredSystems = useMemo(() => {
        return systems
            .filter(system => {
                // Type filtering
                if (system.target_type !== optimisticType) return false;

                // Name filtering
                if (nameQuery.trim()) {
                    const term = nameQuery.trim().toLowerCase();
                    if (!system.name.toLowerCase().includes(term)) return false;
                }

                return true;
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [systems, optimisticType, nameQuery]);

    const handleCardClick = (system: SalarySystem) => {
        setSelectedSystem(system);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedSystem(null);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedSystem(null);
    };

    const handleSaved = (savedSystem: SalarySystem) => {
        if (selectedSystem) {
            // Update existing
            setSystems(prev => prev.map(s => s.id === savedSystem.id ? savedSystem : s));
        } else {
            // Add new
            setSystems(prev => [savedSystem, ...prev]);
        }
    };

    const handleDeleted = (id: string) => {
        setSystems(prev => prev.filter(s => s.id !== id));
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    };

    return (
        <div className="space-y-2">
            {/* Top row: Filter + Plus button */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    className={`flex items-center gap-1 px-1 py-1 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        hasFilters ? "text-blue-600" : "text-gray-500 dark:text-gray-400"
                    }`}
                    onClick={() => setIsFilterDialogOpen(true)}
                >
                    <Filter className="h-5 w-5 shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        フィルター: {getFilterSummary()}
                    </span>
                </button>

{canEdit && (
                    <Button
                        size="icon"
                        className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                        onClick={handleCreate}
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {/* Vercel-style Tab Navigation */}
            <VercelTabs
                tabs={[
                    { key: "cast", label: "キャスト" },
                    { key: "staff", label: "スタッフ" },
                ]}
                value={optimisticType}
                onChange={(val) => handleTypeChange(val as TabType)}
                className="mb-4"
            />

            {filteredSystems.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p>給与システムがありません</p>
                    <p className="text-sm mt-1">右上の＋ボタンから作成できます</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredSystems.map(system => (
                        <div
                            key={system.id}
                            onClick={() => handleCardClick(system)}
                            className="cursor-pointer rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-all hover:border-blue-300 dark:hover:border-blue-600"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="font-semibold text-gray-900 dark:text-white truncate flex-1 mr-2">
                                    {system.name}
                                </h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${system.target_type === 'cast' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                    {system.target_type === 'cast' ? 'キャスト' : 'スタッフ'}
                                </span>
                            </div>

                            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    <span>適用人数: {system.profile_count || 0}名</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    <span>作成日: {formatDate(system.created_at)}</span>
                                </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex flex-wrap gap-1">
                                    {system.hourly_settings && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                            {system.hourly_settings.is_monthly ? '月給' : '時給'}
                                        </span>
                                    )}
                                    {system.store_back_settings && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                            店舗バック
                                        </span>
                                    )}
                                    {system.jounai_back_settings && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                            場内
                                        </span>
                                    )}
                                    {system.shimei_back_settings && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                            指名
                                        </span>
                                    )}
                                    {system.douhan_back_settings && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                                            同伴
                                        </span>
                                    )}
                                    {system.deductions && system.deductions.length > 0 && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                            引かれもの×{system.deductions.length}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <SalarySystemModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                system={selectedSystem}
                targetType={optimisticType as 'cast' | 'staff'}
                onSaved={handleSaved}
                onDeleted={handleDeleted}
                storeShowBreakColumns={storeShowBreakColumns}
                storeTimeRoundingEnabled={storeTimeRoundingEnabled}
                storeTimeRoundingMinutes={storeTimeRoundingMinutes}
            />

            {/* フィルターダイアログ */}
            <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden !rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 !p-0">
                    <DialogHeader className="flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={() => setIsFilterDialogOpen(false)}
                            className="p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-gray-900 dark:text-white">フィルター</DialogTitle>
                        <div className="w-7" />
                    </DialogHeader>
                    <div className="space-y-4 p-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                システム名で検索
                            </label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="システム名で検索..."
                                    value={nameQuery}
                                    onChange={(e) => setNameQuery(e.target.value)}
                                    className="pl-8 bg-white dark:bg-gray-800"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex flex-col gap-2 px-6 pb-6">
                        <Button
                            onClick={() => setIsFilterDialogOpen(false)}
                            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            適用
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsFilterDialogOpen(false)}
                            className="w-full rounded-lg"
                        >
                            戻る
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
