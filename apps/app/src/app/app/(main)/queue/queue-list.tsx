"use client";

import { useState, useTransition, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Settings, Bell, Trash2, Loader2, Plus, Filter, ChevronLeft, Share2 } from "lucide-react";
import { formatJSTTime, formatJSTDate } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { deleteQueueEntry } from "./actions";
import { QueueSettingsModal } from "./queue-settings-modal";
import { QueueShareModal } from "./queue-share-modal";
import { QueueAddModal } from "./queue-add-modal";
import { QueueEditModal } from "./queue-edit-modal";
import type { QueueEntry, QueueSettings, QueueStatus } from "./types";
import { getBusinessDate, getDateFromTimestamp } from "./utils";
import { VercelTabs } from "@/components/ui/vercel-tabs";

interface QueueListProps {
    entries: QueueEntry[];
    storeId: string;
    storeName: string;
    settings: QueueSettings;
    daySwitchTime: string;
    canEdit?: boolean;
}

export function QueueList({ entries, storeId, storeName, settings, daySwitchTime, canEdit = false }: QueueListProps) {
    const [statusTab, setStatusTab] = useState<QueueStatus>("waiting");
    const [dateFilter, setDateFilter] = useState<"today" | "all">("all");
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<QueueEntry | null>(null);
    const [notifyTarget, setNotifyTarget] = useState<QueueEntry | null>(null);
    const [isPending, startTransition] = useTransition();
    const [localEntries, setLocalEntries] = useState(entries);
    const [localSettings, setLocalSettings] = useState(settings);
    const { toast } = useToast();

    // Sync localEntries when entries prop changes
    useEffect(() => {
        setLocalEntries(entries);
    }, [entries]);

    // Sync localSettings when settings prop changes
    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    // 営業日を計算（店舗の切り替え時間を考慮）
    const today = getBusinessDate(daySwitchTime);

    // まずステータスでフィルタリング（タブで切り替え）
    const statusFilteredEntries = localEntries.filter((e) => e.status === statusTab);

    // 日付フィルター（created_atの日付部分で判定）
    const dateFilteredEntries = dateFilter === "today"
        ? statusFilteredEntries.filter((e) => getDateFromTimestamp(e.created_at) === today)
        : selectedDate
            ? statusFilteredEntries.filter((e) => getDateFromTimestamp(e.created_at) === selectedDate)
            : statusFilteredEntries;

    // 最新順にソート（降順）
    const filteredEntries = [...dateFilteredEntries].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // ステータス別カウント（全体）
    const waitingCount = localEntries.filter((e) => e.status === "waiting").length;
    const visitedCount = localEntries.filter((e) => e.status === "visited").length;
    const cancelledCount = localEntries.filter((e) => e.status === "cancelled").length;

    // フィルター表示用ラベル
    const hasDateFilter = dateFilter === "all" && selectedDate !== "";

    const getFilterLabel = () => {
        if (hasDateFilter) {
            return selectedDate.replace(/-/g, "/").replace(/^\d{4}\//, "");
        }
        return dateFilter === "today" ? "今日" : "すべて";
    };
    const filterLabel = getFilterLabel();

    const handleDelete = () => {
        if (!deleteTarget) return;
        startTransition(async () => {
            await deleteQueueEntry(deleteTarget.id);
            setLocalEntries((prev) => prev.filter((e) => e.id !== deleteTarget.id));
            setDeleteTarget(null);
        });
    };

    const handleNotify = async () => {
        if (!notifyTarget) return;
        startTransition(async () => {
            try {
                const response = await fetch("/api/queue/notify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ entryId: notifyTarget.id }),
                });

                const result = await response.json();

                if (result.success) {
                    setLocalEntries((prev) =>
                        prev.map((e) =>
                            e.id === notifyTarget.id
                                ? { ...e, status: "notified" as const, notified_at: new Date().toISOString() }
                                : e
                        )
                    );
                    toast({
                        title: "通知を送信しました",
                        description: `${notifyTarget.guest_name}さんにメールを送信しました`,
                    });
                } else {
                    toast({
                        title: "通知の送信に失敗しました",
                        description: result.error || "しばらく経ってからもう一度お試しください",
                    });
                }
            } catch (err) {
                toast({
                    title: "エラー",
                    description: "通知の送信中にエラーが発生しました",
                });
            }
            setNotifyTarget(null);
        });
    };

    const handleAddSuccess = (newEntry: QueueEntry) => {
        // Ensure created_at is set for filtering (fallback to current time)
        const entryWithCreatedAt = {
            ...newEntry,
            created_at: newEntry.created_at || new Date().toISOString(),
        };
        setLocalEntries((prev) => [...prev, entryWithCreatedAt]);
        // Ensure we're on the "waiting" tab to see the new entry
        setStatusTab("waiting");
        toast({
            title: "順番待ちを追加しました",
            description: `${newEntry.guest_name}さん（番号: ${newEntry.queue_number}）`,
        });
    };

    // Open edit modal for an entry
    const handleSelectEntry = (entry: QueueEntry) => {
        setEditingEntryId(entry.id);
    };

    // Handle edit success - update local entries immediately
    const handleEditSuccess = (entryId: string, updates: { status?: QueueStatus; guestName?: string; partySize?: number }) => {
        setLocalEntries((prev) =>
            prev.map((e) =>
                e.id === entryId
                    ? {
                        ...e,
                        status: updates.status ?? e.status,
                        guest_name: updates.guestName ?? e.guest_name,
                        party_size: updates.partySize ?? e.party_size,
                    }
                    : e
            )
        );
    };

    // Handle delete from edit modal
    const handleDeleteFromEdit = () => {
        if (editingEntryId) {
            setLocalEntries((prev) => prev.filter((e) => e.id !== editingEntryId));
        }
    };

    return (
        <div className="space-y-4">
            {/* ヘッダー */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    className="flex items-center gap-1 px-1 py-1 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                    onClick={() => setIsFilterOpen(true)}
                >
                    <Filter className="h-5 w-5 shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {filterLabel}
                    </span>
                </button>
                <div className="flex-1" />
                {canEdit && (
                    <>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-full"
                            onClick={() => setIsSettingsOpen(true)}
                        >
                            <Settings className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-full"
                            onClick={() => setIsShareOpen(true)}
                        >
                            <Share2 className="h-5 w-5" />
                        </Button>
                        <Button
                            size="icon"
                            className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                            onClick={() => setIsAddOpen(true)}
                        >
                            <Plus className="h-5 w-5" />
                        </Button>
                    </>
                )}
            </div>

            {/* 有効/無効ステータス */}
            {!localSettings.queue_enabled && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        順番待ち機能は現在無効になっています。設定から有効にしてください。
                    </p>
                </div>
            )}

            <VercelTabs
                tabs={[
                    { key: "waiting", label: `予約 (${waitingCount})` },
                    { key: "visited", label: `来店済 (${visitedCount})` },
                    { key: "cancelled", label: `キャンセル (${cancelledCount})` },
                ]}
                value={statusTab}
                onChange={(val) => setStatusTab(val as QueueStatus)}
                className="mb-4"
            />

            {/* テーブル */}
            <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <Table className="table-fixed">
                    <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                            <TableHead className="w-[12%] px-2 text-center text-gray-900 dark:text-gray-100">No.</TableHead>
                            <TableHead className="w-[23%] px-2 text-center text-gray-900 dark:text-gray-100">日付</TableHead>
                            <TableHead className="w-[18%] px-2 text-center text-gray-900 dark:text-gray-100">時間</TableHead>
                            <TableHead className="w-[32%] px-2 text-center text-gray-900 dark:text-gray-100">名前</TableHead>
                            <TableHead className="w-[15%] px-2 text-center text-gray-900 dark:text-gray-100">人数</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredEntries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    {statusTab === "waiting" && "予約はありません"}
                                    {statusTab === "visited" && "来店済みの予約はありません"}
                                    {statusTab === "cancelled" && "キャンセルされた予約はありません"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredEntries.map((entry) => (
                                <TableRow
                                    key={entry.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                    onClick={() => handleSelectEntry(entry)}
                                >
                                    <TableCell className="px-2 text-center font-medium text-gray-900 dark:text-gray-100">
                                        {entry.queue_number}
                                    </TableCell>
                                    <TableCell className="px-2 text-center text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                        {formatJSTDate(entry.created_at).replace(/\d{4}\//, "")}
                                    </TableCell>
                                    <TableCell className="px-2 text-center text-sm text-gray-900 dark:text-gray-100">
                                        {formatJSTTime(entry.created_at)}
                                    </TableCell>
                                    <TableCell className="px-2 text-center text-gray-900 dark:text-gray-100 truncate">
                                        {entry.guest_name}
                                    </TableCell>
                                    <TableCell className="px-2 text-center text-gray-900 dark:text-gray-100">
                                        {entry.party_size}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* 設定モーダル */}
            <QueueSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                storeId={storeId}
                storeName={storeName}
                initialSettings={localSettings}
                onSettingsChange={setLocalSettings}
            />

            {/* 共有モーダル */}
            <QueueShareModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                storeId={storeId}
                storeName={storeName}
                isEnabled={localSettings.queue_enabled}
            />

            {/* 追加モーダル */}
            <QueueAddModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                storeId={storeId}
                settings={localSettings}
                onSuccess={handleAddSuccess}
            />

            {/* 削除確認ダイアログ */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="space-y-1.5">
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
                            エントリを削除
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                            {deleteTarget?.guest_name}さんのエントリを削除しますか？
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isPending}
                            className="rounded-lg"
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "削除"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 通知確認ダイアログ */}
            <Dialog open={!!notifyTarget} onOpenChange={(open) => !open && setNotifyTarget(null)}>
                <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="space-y-1.5">
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
                            通知を送信
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                            {notifyTarget?.guest_name}さんに通知を送信しますか？
                            <br />
                            <span className="text-xs mt-1 block">
                                メールで通知されます
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setNotifyTarget(null)}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleNotify}
                            disabled={isPending}
                            className="rounded-lg"
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Bell className="h-5 w-5 mr-1" />
                                    送信
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 編集モーダル */}
            <QueueEditModal
                isOpen={!!editingEntryId}
                onClose={() => setEditingEntryId(null)}
                storeId={storeId}
                entryId={editingEntryId || ""}
                onSuccess={handleEditSuccess}
                onDelete={handleDeleteFromEdit}
            />

            {/* フィルターモーダル */}
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={() => setIsFilterOpen(false)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white">
                            フィルター
                        </DialogTitle>
                        <div className="w-8 h-8" />
                    </DialogHeader>
                    <div className="flex flex-col gap-4 p-6">
                        {/* 日付フィルター */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                期間
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDateFilter("today");
                                        setSelectedDate("");
                                    }}
                                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                        dateFilter === "today"
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    今日
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDateFilter("all")}
                                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                        dateFilter === "all"
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    すべて
                                </button>
                            </div>
                        </div>

                        {/* 日付選択（すべてを選択時） */}
                        {dateFilter === "all" && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    日付を指定
                                </label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base ring-offset-white file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:ring-offset-gray-950 dark:placeholder:text-gray-400"
                                />
                            </div>
                        )}

                        <Button
                            className="w-full rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            onClick={() => setIsFilterOpen(false)}
                        >
                            適用
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
