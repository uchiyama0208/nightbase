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
import { formatJSTDate } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";

interface BottleListProps {
    storeId: string;
    menus: any[];
    profiles: any[];
}

export function BottleList({ storeId, menus, profiles }: BottleListProps) {
    const [bottles, setBottles] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBottle, setEditingBottle] = useState<any | null>(null);
    const [remainingFilter, setRemainingFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isPending, startTransition] = useTransition();

    const activeFilters = [
        searchQuery.trim() && "検索",
        remainingFilter !== "all" && "残量",
    ].filter(Boolean) as string[];
    const hasFilters = activeFilters.length > 0;

    const fetchBottles = useCallback(async () => {
        startTransition(async () => {
            const data = await getBottleKeeps({ remainingAmount: remainingFilter, search: searchQuery });
            setBottles(data || []);
        });
    }, [remainingFilter, searchQuery]);

    useEffect(() => {
        fetchBottles();
    }, [fetchBottles, remainingFilter, searchQuery]);

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

    const handleModalClose = (shouldRefresh = false) => {
        setIsModalOpen(false);
        setEditingBottle(null);
        if (shouldRefresh) {
            fetchBottles();
        }
    };

    const getRemainingAmountText = (amount: number) => {
        if (amount === 100) return "未開封";
        if (amount === 75) return "多め";
        if (amount === 50) return "半分";
        if (amount === 25) return "少なめ";
        if (amount === 0) return "無し";
        return `${amount}%`;
    };



    return (
        <div className="space-y-4">
            <div className="flex items-center justify-end mb-4">
                <Button
                    size="icon"
                    className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                    onClick={handleCreateNew}
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
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="ボトル名やゲスト名で検索..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 w-full h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs md:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <Select value={remainingFilter} onValueChange={setRemainingFilter}>
                                <SelectTrigger className="w-full h-10">
                                    <SelectValue placeholder="残量" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">すべて</SelectItem>
                                    <SelectItem value="100">未開封</SelectItem>
                                    <SelectItem value="75">多め</SelectItem>
                                    <SelectItem value="50">半分</SelectItem>
                                    <SelectItem value="25">少なめ</SelectItem>
                                    <SelectItem value="0">無し</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/5">ゲスト</TableHead>
                            <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/5">ボトル</TableHead>
                            <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/5">残量</TableHead>
                            <TableHead className="hidden md:table-cell px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/5">開栓日</TableHead>
                            <TableHead className="hidden md:table-cell px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/5">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isPending ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    読み込み中...
                                </TableCell>
                            </TableRow>
                        ) : bottles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Wine className="h-12 w-12 text-gray-300" />
                                        <p>ボトルキープがありません</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            bottles.map((bottle) => (
                                <TableRow 
                                    key={bottle.id} 
                                    className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                                    onClick={() => handleEdit(bottle)}
                                >
                                    <TableCell className="px-3 sm:px-4 text-center text-gray-900 dark:text-white">
                                        {bottle.bottle_keep_holders
                                            ?.map((h: any) => h.profiles?.display_name)
                                            .filter(Boolean)
                                            .join(", ") || "-"}
                                    </TableCell>
                                    <TableCell className="px-3 sm:px-4 text-center text-gray-900 dark:text-white">
                                        {bottle.menus?.name || "-"}
                                    </TableCell>
                                    <TableCell className="px-3 sm:px-4 text-center text-gray-900 dark:text-white">
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
                                        {bottle.opened_at
                                            ? formatJSTDate(bottle.opened_at)
                                            : "-"}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-center" onClick={(e) => e.stopPropagation()}>
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

            {/* Modal - 常にレンダリングして状態を保持 */}
            <BottleModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                bottle={editingBottle}
                menus={menus}
                profiles={profiles}
            />
        </div>
    );
}
