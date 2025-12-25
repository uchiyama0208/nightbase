"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Settings, Plus, Share2 } from "lucide-react";
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
    TableCell,
} from "@/components/ui/table";
import { formatJSTDate } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { ReservationSettingsModal } from "./reservation-settings-modal";
import { ReservationShareModal } from "./reservation-share-modal";
import { ReservationAddModal } from "./reservation-add-modal";
import { ReservationEditModal } from "./reservation-edit-modal";
import { VercelTabs } from "@/components/ui/vercel-tabs";

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
        reservation_email_setting: "hidden" | "optional" | "required";
        reservation_phone_setting: "hidden" | "optional" | "required";
        reservation_cast_selection_enabled: boolean;
    };
    daySwitchTime: string;
    canEdit?: boolean;
}

type StatusTab = "waiting" | "visited" | "cancelled";

export function ReservationList({ reservations, storeId, storeName, settings, daySwitchTime, canEdit = false }: ReservationListProps) {
    const queryClient = useQueryClient();
    const [statusTab, setStatusTab] = useState<StatusTab>("waiting");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
    const [localReservations, setLocalReservations] = useState(reservations);
    const { toast } = useToast();

    // ステータスでフィルター
    const filteredReservations = localReservations.filter((r) => r.status === statusTab);

    // ステータス別カウント
    const waitingCount = localReservations.filter((r) => r.status === "waiting").length;
    const visitedCount = localReservations.filter((r) => r.status === "visited").length;
    const cancelledCount = localReservations.filter((r) => r.status === "cancelled").length;

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
        // 他のページからアクセスした際のキャッシュも無効化
        queryClient.invalidateQueries({ queryKey: ["reservations"] });
        toast({
            title: "予約を追加しました",
        });
    };

    const handleEditSuccess = (reservationId?: string, updates?: Partial<Reservation>) => {
        // ローカルstateを更新
        if (reservationId && updates) {
            setLocalReservations((prev) =>
                prev.map((r) =>
                    r.id === reservationId ? { ...r, ...updates } : r
                )
            );
        }
        // キャッシュを無効化して最新データを取得
        queryClient.invalidateQueries({ queryKey: ["reservations"] });
    };

    const handleDeleteSuccess = (deletedId: string) => {
        // ローカルstateから削除
        setLocalReservations((prev) => prev.filter((r) => r.id !== deletedId));
        // キャッシュを無効化
        queryClient.invalidateQueries({ queryKey: ["reservations"] });
        toast({
            title: "予約を削除しました",
        });
    };

    return (
        <div className="space-y-4">
            {/* ヘッダー */}
            <div className="flex items-center gap-2">
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
            {!settings.reservation_enabled && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        予約機能は現在無効になっています。設定から有効にしてください。
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
                onChange={(val) => setStatusTab(val as StatusTab)}
                className="mb-4"
            />

            {/* 予約リスト */}
            <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <Table className="table-fixed">
                    <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                            <TableHead className="w-[25%] px-2 text-center text-gray-900 dark:text-gray-100">日付</TableHead>
                            <TableHead className="w-[20%] px-2 text-center text-gray-900 dark:text-gray-100">時間</TableHead>
                            <TableHead className="w-[35%] px-2 text-center text-gray-900 dark:text-gray-100">名前</TableHead>
                            <TableHead className="w-[20%] px-2 text-center text-gray-900 dark:text-gray-100">人数</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredReservations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    予約はありません
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredReservations.map((reservation) => (
                                <TableRow
                                    key={reservation.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                    onClick={() => setEditingReservationId(reservation.id)}
                                >
                                    <TableCell className="px-2 text-center text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                        {formatJSTDate(reservation.reservation_date).replace(/\d{4}\//, "")}
                                    </TableCell>
                                    <TableCell className="px-2 text-center text-sm text-gray-900 dark:text-gray-100">
                                        {reservation.reservation_time.slice(0, 5)}
                                    </TableCell>
                                    <TableCell className="px-2 text-center text-gray-900 dark:text-gray-100 truncate">
                                        {reservation.guest_name}
                                    </TableCell>
                                    <TableCell className="px-2 text-center text-gray-900 dark:text-gray-100">
                                        {reservation.party_size}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* 設定モーダル */}
            <ReservationSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                storeId={storeId}
                initialSettings={settings}
            />

            {/* 共有モーダル */}
            <ReservationShareModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                storeId={storeId}
                storeName={storeName}
            />

            {/* 追加モーダル */}
            <ReservationAddModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                storeId={storeId}
                onSuccess={handleAddSuccess}
                settings={settings}
            />

            {/* 編集モーダル */}
            {editingReservationId && (
                <ReservationEditModal
                    isOpen={!!editingReservationId}
                    onClose={() => setEditingReservationId(null)}
                    storeId={storeId}
                    reservationId={editingReservationId}
                    onSuccess={handleEditSuccess}
                    onDelete={() => handleDeleteSuccess(editingReservationId)}
                    settings={settings}
                />
            )}
        </div>
    );
}
