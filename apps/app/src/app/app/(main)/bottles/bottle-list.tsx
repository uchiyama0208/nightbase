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
import { Plus, Search, Wine, Trash2, Edit, Filter, ChevronLeft } from "lucide-react";
import { getBottleKeeps, deleteBottleKeep } from "./actions";
import { BottleModal } from "./bottle-modal";
import { formatJSTDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface PagePermissions {
    bottles: boolean;
    resumes: boolean;
    salarySystems: boolean;
    attendance: boolean;
    personalInfo: boolean;
}

interface BottleListProps {
    storeId: string;
    menus: any[];
    profiles: any[];
    canEdit?: boolean;
    pagePermissions?: PagePermissions;
}

export function BottleList({ storeId, menus, profiles, canEdit = false, pagePermissions }: BottleListProps) {
    const [bottles, setBottles] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBottle, setEditingBottle] = useState<any | null>(null);
    const [remainingFilter, setRemainingFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isPending, startTransition] = useTransition();
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

    const remainingLabels: Record<string, string> = {
        "100": "未開封",
        "75": "多め",
        "50": "半分",
        "25": "少なめ",
        "0": "無し",
    };

    const activeFilters = useMemo(() => [
        searchQuery.trim() && `"${searchQuery}"`,
        remainingFilter !== "all" && remainingLabels[remainingFilter],
    ].filter(Boolean) as string[], [searchQuery, remainingFilter]);
    const hasFilters = activeFilters.length > 0;

    const getFilterSummary = useCallback(() => {
        if (!hasFilters) return "なし";
        return activeFilters.join("・");
    }, [hasFilters, activeFilters]);

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

    const handleCreateNew = useCallback(() => {
        setEditingBottle(null);
        setIsModalOpen(true);
    }, []);

    const handleEdit = useCallback((bottle: any) => {
        setEditingBottle(bottle);
        setIsModalOpen(true);
    }, []);

    const handleDeleteClick = useCallback((id: string) => {
        setDeleteTargetId(id);
        setIsDeleteDialogOpen(true);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (deleteTargetId) {
            await deleteBottleKeep(deleteTargetId);
            fetchBottles();
        }
        setIsDeleteDialogOpen(false);
        setDeleteTargetId(null);
    }, [deleteTargetId, fetchBottles]);

    const handleModalClose = useCallback((shouldRefresh = false) => {
        setIsModalOpen(false);
        setEditingBottle(null);
        if (shouldRefresh) {
            fetchBottles();
        }
    }, [fetchBottles]);

    const getRemainingAmountText = useCallback((amount: number) => {
        if (amount === 100) return "未開封";
        if (amount === 75) return "多め";
        if (amount === 50) return "半分";
        if (amount === 25) return "少なめ";
        if (amount === 0) return "無し";
        return `${amount}%`;
    }, []);



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
                        onClick={handleCreateNew}
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                )}
            </div>

            <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <Table className="table-fixed">
                    <TableHeader>
                        <TableRow className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/5">ゲスト</TableHead>
                            <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/5">ボトル</TableHead>
                            <TableHead className="px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/5">残量</TableHead>
                            <TableHead className="hidden md:table-cell px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/5">開栓日</TableHead>
                            {canEdit && <TableHead className="hidden md:table-cell px-3 sm:px-4 text-center text-gray-500 dark:text-gray-400 w-1/5">操作</TableHead>}
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
                                    {canEdit && (
                                        <TableCell className="hidden md:table-cell text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(bottle)}
                                                >
                                                    <Edit className="h-5 w-5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteClick(bottle.id)}
                                                >
                                                    <Trash2 className="h-5 w-5 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
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
                pagePermissions={pagePermissions}
            />

            {/* 削除確認ダイアログ */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">削除の確認</DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                            このボトルキープを削除しますか？この操作は取り消せません。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            className="rounded-lg"
                        >
                            削除する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* フィルターダイアログ */}
            <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden !rounded-2xl border border-gray-200 bg-white !p-0 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={() => setIsFilterDialogOpen(false)}
                            className="p-1 -ml-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-gray-900 dark:text-white">フィルター</DialogTitle>
                        <div className="w-7" />
                    </DialogHeader>
                    <div className="space-y-4 px-6 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                検索
                            </label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="ボトル名やゲスト名で検索..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 bg-white dark:bg-gray-800"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                残量
                            </label>
                            <Select value={remainingFilter} onValueChange={setRemainingFilter}>
                                <SelectTrigger className="w-full bg-white dark:bg-gray-800">
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
