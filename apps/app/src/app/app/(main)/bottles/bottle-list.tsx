"use client";

import { useState, useEffect, useTransition, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Search, Wine, Trash2, Edit } from "lucide-react";
import { getBottleKeeps, deleteBottleKeep } from "./actions";
import { BottleModal } from "./bottle-modal";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FilterSuggestionInput } from "@/components/filter-suggestion-input";

interface BottleListProps {
    storeId: string;
    menus: any[];
    profiles: any[];
}

export function BottleList({ storeId, menus, profiles }: BottleListProps) {
    const [bottles, setBottles] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBottle, setEditingBottle] = useState<any | null>(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isPending, startTransition] = useTransition();

    const activeFilters = [
        searchQuery.trim() && "検索",
        statusFilter !== "all" && "ステータス",
    ].filter(Boolean) as string[];
    const hasFilters = activeFilters.length > 0;

    const fetchBottles = useCallback(async () => {
        startTransition(async () => {
            const data = await getBottleKeeps({ status: statusFilter, search: searchQuery });
            setBottles(data || []);
        });
    }, [statusFilter, searchQuery]);

    useEffect(() => {
        fetchBottles();
    }, [fetchBottles, statusFilter, searchQuery]);

    const suggestionItems = useMemo(
        () =>
            Array.from(
                new Set(
                    bottles
                        .flatMap((bottle) => [bottle?.guest_name, bottle?.bottle_name])
                        .filter((name) => !!name),
                ),
            ) as string[],
        [bottles],
    );

    const handleCreateNew = () => {
        setEditingBottle(null);
        setIsModalOpen(true);
    };

    const handleEdit = (bottle: any) => {
        setEditingBottle(bottle);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("このボトルキープを削除しますか？")) {
            await deleteBottleKeep(id);
            fetchBottles();
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingBottle(null);
        fetchBottles();
    };

    const getRemainingAmountText = (amount: number) => {
        if (amount === 100) return "未開封";
        if (amount === 75) return "多め";
        if (amount === 50) return "半分";
        if (amount === 25) return "少なめ";
        if (amount === 0) return "無し";
        return `${amount}%`;
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "active": return "利用中";
            case "empty": return "空";
            case "returned": return "返却済";
            default: return status;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Accordion type="single" collapsible className="w-full sm:w-auto">
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
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <div className="relative flex-1 sm:flex-none sm:w-[240px]">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <FilterSuggestionInput
                                                placeholder="ボトル名やゲスト名で検索..."
                                                value={searchQuery}
                                                onValueChange={setSearchQuery}
                                                suggestions={suggestionItems}
                                                className="pl-10"
                                            />
                                        </div>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="flex-1 sm:flex-none sm:w-[240px]">
                                            <SelectValue placeholder="ステータス" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">すべて</SelectItem>
                                            <SelectItem value="active">利用中</SelectItem>
                                            <SelectItem value="empty">空</SelectItem>
                                            <SelectItem value="returned">返却済</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                <Button onClick={handleCreateNew} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    新規登録
                </Button>
            </div>

            {/* Table */}
            <div className="border rounded-3xl overflow-hidden bg-white dark:bg-gray-800">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-900">
                            <TableHead className="text-gray-900 dark:text-white font-semibold text-center w-1/3 md:w-1/6">ゲスト</TableHead>
                            <TableHead className="text-gray-900 dark:text-white font-semibold text-center w-1/3 md:w-1/6">ボトル</TableHead>
                            <TableHead className="text-gray-900 dark:text-white font-semibold text-center w-1/3 md:w-1/6">残量</TableHead>
                            <TableHead className="hidden md:table-cell text-gray-900 dark:text-white font-semibold text-center w-1/6">ステータス</TableHead>
                            <TableHead className="hidden md:table-cell text-gray-900 dark:text-white font-semibold text-center w-1/6">開栓日</TableHead>
                            <TableHead className="hidden md:table-cell text-gray-900 dark:text-white font-semibold text-center w-1/6">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isPending ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    読み込み中...
                                </TableCell>
                            </TableRow>
                        ) : bottles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <Wine className="h-12 w-12 text-gray-300" />
                                        <p>ボトルキープがありません</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            bottles.map((bottle) => (
                                <TableRow key={bottle.id}>
                                    <TableCell className="text-center">
                                        {bottle.bottle_keep_holders
                                            ?.map((h: any) => h.profiles?.display_name)
                                            .filter(Boolean)
                                            .join(", ") || "-"}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {bottle.menus?.name || "-"}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${bottle.remaining_amount <= 0
                                            ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                            : bottle.remaining_amount < 50
                                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                                : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                            }`}>
                                            {getRemainingAmountText(bottle.remaining_amount)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-center">
                                        <span className={`inline-block px-2 py-1 rounded text-xs ${bottle.status === "active"
                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                            : bottle.status === "empty"
                                                ? "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                                : "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                                            }`}>
                                            {getStatusText(bottle.status)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-center">
                                        {bottle.opened_at
                                            ? format(new Date(bottle.opened_at), "yyyy/MM/dd", { locale: ja })
                                            : "-"}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-center">
                                        <div className="flex justify-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(bottle)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(bottle.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <BottleModal
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    bottle={editingBottle}
                    menus={menus}
                    profiles={profiles}
                />
            )}
        </div>
    );
}
