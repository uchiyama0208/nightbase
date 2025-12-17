"use client";

import { useState, useTransition, useRef, useEffect } from "react";
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
import { Settings, Bell, Trash2, Loader2, Users, Check, Plus, Filter, X, ChevronLeft } from "lucide-react";
import { formatJSTTime } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { deleteQueueEntry } from "./actions";
import { QueueSettingsModal } from "./queue-settings-modal";
import { QueueAddModal } from "./queue-add-modal";
import type { QueueEntry, QueueSettings, QueueStatusFilter } from "./types";
import { getBusinessDate, getDateFromTimestamp } from "./utils";

interface QueueListProps {
    entries: QueueEntry[];
    storeId: string;
    storeName: string;
    settings: QueueSettings;
    daySwitchTime: string;
    canEdit?: boolean;
}

export function QueueList({ entries, storeId, storeName, settings, daySwitchTime, canEdit = false }: QueueListProps) {
    const [dateFilter, setDateFilter] = useState<"today" | "all">("today");
    const [statusFilter, setStatusFilter] = useState<QueueStatusFilter>("all");
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<QueueEntry | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<QueueEntry | null>(null);
    const [notifyTarget, setNotifyTarget] = useState<QueueEntry | null>(null);
    const [isPending, startTransition] = useTransition();
    const [localEntries, setLocalEntries] = useState(entries);
    const { toast } = useToast();

    // Vercel-style tabs
    const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    useEffect(() => {
        const activeButton = tabsRef.current[dateFilter];
        if (activeButton) {
            setIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
            });
        }
    }, [dateFilter]);

    // 営業日を計算（店舗の切り替え時間を考慮）
    const today = getBusinessDate(daySwitchTime);

    // 日付フィルター（created_atの日付部分で判定）
    const dateFilteredEntries = dateFilter === "today"
        ? localEntries.filter((e) => getDateFromTimestamp(e.created_at) === today)
        : selectedDate
            ? localEntries.filter((e) => getDateFromTimestamp(e.created_at) === selectedDate)
            : localEntries;

    // ステータスフィルター
    const filteredEntries = statusFilter === "all"
        ? dateFilteredEntries
        : dateFilteredEntries.filter((e) => e.status === statusFilter);

    const todayCount = localEntries.filter((e) => getDateFromTimestamp(e.created_at) === today).length;
    const allCount = localEntries.length;

    // ステータス別カウント（日付フィルター適用後）
    const waitingCount = dateFilteredEntries.filter((e) => e.status === "waiting").length;
    const notifiedCount = dateFilteredEntries.filter((e) => e.status === "notified").length;

    // フィルター表示用ラベル
    const statusLabels: Record<QueueStatusFilter, string> = {
        all: "すべて",
        waiting: "待機中",
        notified: "通知済み",
    };
    const hasStatusFilter = statusFilter !== "all";
    const hasDateFilter = dateFilter === "all" && selectedDate !== "";
    const hasFilters = hasStatusFilter || hasDateFilter;

    const getFilterLabel = () => {
        const parts: string[] = [];
        if (hasStatusFilter) parts.push(statusLabels[statusFilter]);
        if (hasDateFilter) parts.push(selectedDate.replace(/-/g, "/").replace(/^\d{4}\//, ""));
        return parts.length > 0 ? parts.join(", ") : "なし";
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
        setLocalEntries((prev) => [...prev, newEntry]);
        toast({
            title: "順番待ちを追加しました",
            description: `${newEntry.guest_name}さん（番号: ${newEntry.queue_number}）`,
        });
    };

    return (
        <div className="space-y-4">
            {/* ヘッダー */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    className={`flex items-center gap-1 px-1 py-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        hasFilters ? "text-blue-600" : "text-gray-500 dark:text-gray-400"
                    }`}
                    onClick={() => setIsFilterOpen(true)}
                >
                    <Filter className="h-5 w-5 shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        フィルター: {filterLabel}
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
            {!settings.queue_enabled && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        順番待ち機能は現在無効になっています。設定から有効にしてください。
                    </p>
                </div>
            )}

            {/* Vercel-style Tab Navigation */}
            <div className="relative">
                <div className="flex w-full">
                    <button
                        ref={(el) => { tabsRef.current["today"] = el; }}
                        type="button"
                        onClick={() => setDateFilter("today")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                            dateFilter === "today"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        今日 ({todayCount})
                    </button>
                    <button
                        ref={(el) => { tabsRef.current["all"] = el; }}
                        type="button"
                        onClick={() => setDateFilter("all")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                            dateFilter === "all"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        全て ({allCount})
                    </button>
                </div>
                <div
                    className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-200"
                    style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* テーブル */}
            <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                            <TableHead className="w-14 text-center text-gray-900 dark:text-gray-100">番号</TableHead>
                            <TableHead className="text-center text-gray-900 dark:text-gray-100">お名前</TableHead>
                            <TableHead className="w-14 text-center text-gray-900 dark:text-gray-100">人数</TableHead>
                            <TableHead className="w-16 text-center text-gray-900 dark:text-gray-100">登録</TableHead>
                            <TableHead className="w-16 text-center text-gray-900 dark:text-gray-100">通知</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredEntries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    {dateFilter === "today" ? "今日の順番待ちはありません" : "順番待ちはありません"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredEntries.map((entry) => (
                                <TableRow
                                    key={entry.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedEntry(entry)}
                                >
                                    <TableCell className="text-center font-medium text-gray-900 dark:text-gray-100">
                                        {entry.queue_number}
                                    </TableCell>
                                    <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                        {entry.guest_name}
                                    </TableCell>
                                    <TableCell className="text-center text-gray-900 dark:text-gray-100">
                                        <div className="flex items-center justify-center gap-1">
                                            <Users className="h-4 w-4 text-gray-400" />
                                            {entry.party_size}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center text-sm text-gray-500 dark:text-gray-400">
                                        {formatJSTTime(entry.created_at)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {entry.status === "notified" ? (
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30">
                                                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400">未通知</span>
                                        )}
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
                initialSettings={settings}
            />

            {/* 追加モーダル */}
            <QueueAddModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                storeId={storeId}
                onSuccess={handleAddSuccess}
            />

            {/* 削除確認ダイアログ */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="space-y-1.5">
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
                            エントリを削除
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                            {deleteTarget?.guest_name}さんのエントリを削除しますか？
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex justify-end gap-2">
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
                <DialogContent className="max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="space-y-1.5">
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
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
                    <DialogFooter className="mt-4 flex justify-end gap-2">
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
                                    <Bell className="h-4 w-4 mr-1" />
                                    送信
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* エントリ詳細モーダル */}
            <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
                <DialogContent className="max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setSelectedEntry(null)}
                                className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
                                順番待ち詳細
                            </DialogTitle>
                            <button
                                type="button"
                                onClick={() => {
                                    if (selectedEntry) {
                                        setDeleteTarget(selectedEntry);
                                        setSelectedEntry(null);
                                    }
                                }}
                                className="p-1 text-red-500 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                    </DialogHeader>

                    {selectedEntry && (
                        <div className="space-y-4 mt-4">
                            {/* エントリ情報 */}
                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">番号</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {selectedEntry.queue_number}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">お名前</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {selectedEntry.guest_name}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">人数</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {selectedEntry.party_size}名
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">登録時間</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {formatJSTTime(selectedEntry.created_at)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">ステータス</span>
                                    <span className={`text-sm font-medium ${
                                        selectedEntry.status === "waiting"
                                            ? "text-blue-600 dark:text-blue-400"
                                            : "text-green-600 dark:text-green-400"
                                    }`}>
                                        {selectedEntry.status === "waiting" ? "待機中" : "通知済み"}
                                    </span>
                                </div>
                            </div>

                            {/* アクションボタン */}
                            <div className="flex flex-col gap-2">
                                {selectedEntry.status === "waiting" && selectedEntry.contact_value && (
                                    <Button
                                        onClick={() => {
                                            setNotifyTarget(selectedEntry);
                                            setSelectedEntry(null);
                                        }}
                                        className="w-full rounded-lg"
                                    >
                                        <Bell className="h-4 w-4 mr-2" />
                                        通知を送信
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={() => setSelectedEntry(null)}
                                    className="w-full rounded-lg"
                                >
                                    戻る
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* フィルターモーダル */}
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <DialogContent className="max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
                            フィルター
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 mt-4">
                        {/* 日付フィルター（全てタブの場合のみ） */}
                        {dateFilter === "all" && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    日付
                                </label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:ring-offset-gray-950 dark:placeholder:text-gray-400"
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                ステータス
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {(["all", "waiting", "notified"] as QueueStatusFilter[]).map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => setStatusFilter(status)}
                                        className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                            statusFilter === status
                                                ? "bg-blue-600 text-white border-blue-600"
                                                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        }`}
                                    >
                                        {statusLabels[status]}
                                        {status === "all" && ` (${dateFilteredEntries.length})`}
                                        {status === "waiting" && ` (${waitingCount})`}
                                        {status === "notified" && ` (${notifiedCount})`}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            {hasFilters && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setStatusFilter("all");
                                        setSelectedDate("");
                                    }}
                                    className="flex-1 rounded-lg"
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    リセット
                                </Button>
                            )}
                            <Button
                                className="flex-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                                onClick={() => setIsFilterOpen(false)}
                            >
                                適用
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
