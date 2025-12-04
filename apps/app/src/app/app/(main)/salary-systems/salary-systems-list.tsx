"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Calendar } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { SalarySystem } from "./actions";

// Lazy load the modal
const SalarySystemModal = dynamic(
    () => import("./salary-system-modal").then(mod => ({ default: mod.SalarySystemModal })),
    { loading: () => null, ssr: false }
);

interface SalarySystemsListProps {
    initialSystems: SalarySystem[];
    typeFilter: string;
}

export function SalarySystemsList({ initialSystems, typeFilter }: SalarySystemsListProps) {
    const router = useRouter();
    const [systems, setSystems] = useState(initialSystems);
    const [selectedSystem, setSelectedSystem] = useState<SalarySystem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [nameQuery, setNameQuery] = useState("");
    const [optimisticType, setOptimisticType] = useState(typeFilter);

    useEffect(() => {
        setSystems(initialSystems);
    }, [initialSystems]);

    useEffect(() => {
        setOptimisticType(typeFilter);
    }, [typeFilter]);

    const handleTypeChange = (type: string) => {
        setOptimisticType(type);
        router.push(`/app/salary-systems?type=${type}`);
    };

    const activeFilters = [nameQuery.trim() && "名前"].filter(Boolean).map(String);
    const hasFilters = activeFilters.length > 0;

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

    const typeIndex = optimisticType === "cast" ? 0 : 1;

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
        <>
            <div className="flex items-center justify-between mb-4">
                <div className="relative inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
                    <div
                        className="absolute h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-transform duration-300 ease-in-out"
                        style={{
                            width: "80px",
                            left: "4px",
                            transform: `translateX(calc(${typeIndex} * (80px + 0px)))`
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => handleTypeChange("cast")}
                        className={`relative z-10 w-20 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${optimisticType === "cast" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
                    >
                        キャスト
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTypeChange("staff")}
                        className={`relative z-10 w-20 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${optimisticType === "staff" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
                    >
                        スタッフ
                    </button>
                </div>

                <Button
                    size="icon"
                    className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                    onClick={handleCreate}
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </div>

            <Accordion type="single" collapsible className="w-full mb-4">
                <AccordionItem
                    value="filters"
                    className="rounded-2xl border border-gray-200 bg-white px-2 dark:border-gray-700 dark:bg-gray-800"
                >
                    <AccordionTrigger className="px-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <div className="flex w-full items-center justify-between pr-2">
                            <span>フィルター</span>
                            {hasFilters && (
                                <span className="text-xs text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                                    {activeFilters.join("・")}
                                </span>
                            )}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-2">
                        <div className="flex flex-col gap-3 pt-2 pb-2">
                            <Input
                                placeholder="システム名で検索"
                                value={nameQuery}
                                onChange={(e) => setNameQuery(e.target.value)}
                                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-xs md:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

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
                                    <Calendar className="h-4 w-4" />
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
            />
        </>
    );
}
