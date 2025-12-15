"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Settings, Users, Plus, Filter, X } from "lucide-react";
import { formatJSTDate } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { ReservationSettingsModal } from "./reservation-settings-modal";
import { ReservationAddModal } from "./reservation-add-modal";
import { ReservationEditModal } from "./reservation-edit-modal";

interface Reservation {
    id: string;
    store_id: string;
    guest_name: string;
    contact_value: string;
    contact_type: "email" | "phone";
    party_size: number;
    reservation_date: string;
    reservation_time: string;
    nominated_cast_id: string | null;
    status: "waiting" | "visited" | "cancelled";
    reservation_number: number;
    created_at: string;
    nominated_cast?: {
        id: string;
        display_name: string;
    } | null;
}

interface ReservationListProps {
    reservations: Reservation[];
    storeId: string;
    storeName: string;
    settings: {
        reservation_enabled: boolean;
    };
    daySwitchTime: string;
}

type StatusFilter = "all" | "waiting" | "visited" | "cancelled";
type DateFilter = "today" | "all";

export function ReservationList({ reservations, storeId, storeName, settings, daySwitchTime }: ReservationListProps) {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [dateFilter, setDateFilter] = useState<DateFilter>("today");
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
    const [localReservations, setLocalReservations] = useState(reservations);
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
    const getBusinessDate = () => {
        const now = new Date();
        const jstDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
        const currentHour = jstDate.getHours();
        const currentMinute = jstDate.getMinutes();

        // day_switch_time をパース（例: "05:00" → 5時）
        const switchHour = parseInt(daySwitchTime.split(":")[0], 10) || 5;
        const switchMinute = parseInt(daySwitchTime.split(":")[1], 10) || 0;

        // 現在時刻が切り替え時間より前の場合は前日の営業日
        if (currentHour < switchHour || (currentHour === switchHour && currentMinute < switchMinute)) {
            jstDate.setDate(jstDate.getDate() - 1);
        }

        return jstDate.toLocaleDateString("ja-JP", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).replace(/\//g, "-");
    };

    const today = getBusinessDate();

    // 日付フィルター
    const dateFilteredReservations = dateFilter === "today"
        ? localReservations.filter((r) => r.reservation_date === today)
        : selectedDate
            ? localReservations.filter((r) => r.reservation_date === selectedDate)
            : localReservations;

    // ステータスフィルター
    const filteredReservations = statusFilter === "all"
        ? dateFilteredReservations
        : dateFilteredReservations.filter((r) => r.status === statusFilter);

    const todayCount = localReservations.filter((r) => r.reservation_date === today).length;
    const allCount = localReservations.length;

    // ステータス別カウント（日付フィルター適用後）
    const waitingCount = dateFilteredReservations.filter((r) => r.status === "waiting").length;
    const visitedCount = dateFilteredReservations.filter((r) => r.status === "visited").length;
    const cancelledCount = dateFilteredReservations.filter((r) => r.status === "cancelled").length;

    // フィルター表示用ラベル
    const statusLabels: Record<StatusFilter, string> = {
        all: "すべて",
        waiting: "待機中",
        visited: "来店済",
        cancelled: "キャンセル",
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

    const handleAddSuccess = (newReservation: Reservation) => {
        setLocalReservations((prev) => {
            const updated = [...prev, newReservation];
            // 日付と時間でソート
            return updated.sort((a, b) => {
                const dateA = `${a.reservation_date} ${a.reservation_time}`;
                const dateB = `${b.reservation_date} ${b.reservation_time}`;
                return dateA.localeCompare(dateB);
            });
        });
        toast({
            title: "予約を追加しました",
        });
    };

    const handleEditSuccess = () => {
        // ページをリロードして最新データを取得
        window.location.reload();
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "waiting":
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">待機中</Badge>;
            case "visited":
                return <Badge className="bg-green-500">来店済み</Badge>;
            case "cancelled":
                return <Badge variant="destructive">キャンセル</Badge>;
            default:
                return null;
        }
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
            </div>

            {/* 有効/無効ステータス */}
            {!settings.reservation_enabled && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        予約機能は現在無効になっています。設定から有効にしてください。
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

            {/* 予約リスト */}
            <div className="space-y-2">
                {filteredReservations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        {dateFilter === "today" ? "今日の予約はありません" : "予約はありません"}
                    </div>
                ) : (
                    filteredReservations.map((reservation) => (
                        <div
                            key={reservation.id}
                            className="p-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                            onClick={() => setEditingReservationId(reservation.id)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {/* 日時 */}
                                    <div className="text-center shrink-0">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {formatJSTDate(reservation.reservation_date).replace(/\d{4}\//, "")}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {reservation.reservation_time.slice(0, 5)}
                                        </div>
                                    </div>
                                    {/* 名前・人数・指名 */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                {reservation.guest_name}
                                            </span>
                                            <span className="text-xs text-gray-500 flex items-center gap-0.5 shrink-0">
                                                <Users className="h-3 w-3" />
                                                {reservation.party_size}
                                            </span>
                                        </div>
                                        {reservation.nominated_cast?.display_name && (
                                            <div className="text-xs text-gray-500 truncate">
                                                指名: {reservation.nominated_cast.display_name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* ステータス */}
                                <div className="shrink-0">
                                    {getStatusBadge(reservation.status)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 設定モーダル */}
            <ReservationSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                storeId={storeId}
                storeName={storeName}
                initialSettings={settings}
            />

            {/* 追加モーダル */}
            <ReservationAddModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                storeId={storeId}
                onSuccess={handleAddSuccess}
            />

            {/* 編集モーダル */}
            {editingReservationId && (
                <ReservationEditModal
                    isOpen={!!editingReservationId}
                    onClose={() => setEditingReservationId(null)}
                    storeId={storeId}
                    reservationId={editingReservationId}
                    onSuccess={handleEditSuccess}
                />
            )}

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
                            <div className="grid grid-cols-2 gap-2">
                                {(["all", "waiting", "visited", "cancelled"] as StatusFilter[]).map((status) => (
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
                                        {status === "all" && ` (${dateFilteredReservations.length})`}
                                        {status === "waiting" && ` (${waitingCount})`}
                                        {status === "visited" && ` (${visitedCount})`}
                                        {status === "cancelled" && ` (${cancelledCount})`}
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
