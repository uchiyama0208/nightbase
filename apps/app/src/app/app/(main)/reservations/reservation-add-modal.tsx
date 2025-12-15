"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, User, X } from "lucide-react";
import { addReservationV2, getCastsForStore, getGuestsForStore, getTablesForStore } from "./actions";
import { GuestSelectorModal, SelectedGuest } from "@/components/selectors/guest-selector-modal";
import { CastSelectorModal, SelectedCast, NominationType } from "@/components/selectors/cast-selector-modal";

interface Profile {
    id: string;
    display_name: string;
}

interface TableInfo {
    id: string;
    name: string;
    capacity: number;
}

interface GuestWithCasts extends SelectedGuest {
    casts: SelectedCast[];
}

interface ReservationAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
    onSuccess: (reservation: any) => void;
}

// 時間選択肢を生成（18:00〜翌5:00、30分刻み）
function generateTimeOptions() {
    const options: string[] = [];
    // 18:00〜23:30
    for (let h = 18; h <= 23; h++) {
        options.push(`${h.toString().padStart(2, "0")}:00`);
        options.push(`${h.toString().padStart(2, "0")}:30`);
    }
    // 00:00〜05:00
    for (let h = 0; h <= 5; h++) {
        options.push(`${h.toString().padStart(2, "0")}:00`);
        if (h < 5) {
            options.push(`${h.toString().padStart(2, "0")}:30`);
        }
    }
    return options;
}

const timeOptions = generateTimeOptions();

const NOMINATION_TYPE_LABELS: Record<NominationType, string> = {
    shimei: "指名",
    douhan: "同伴",
    banai: "場内",
};

const NOMINATION_TYPE_COLORS: Record<NominationType, string> = {
    shimei: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300",
    douhan: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    banai: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
};

export function ReservationAddModal({
    isOpen,
    onClose,
    storeId,
    onSuccess,
}: ReservationAddModalProps) {
    const [isPending, startTransition] = useTransition();
    const [casts, setCasts] = useState<Profile[]>([]);
    const [guests, setGuests] = useState<Profile[]>([]);
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [loading, setLoading] = useState(false);

    // フォーム状態
    const [reservationDate, setReservationDate] = useState("");
    const [reservationTime, setReservationTime] = useState("19:00");
    const [selectedGuests, setSelectedGuests] = useState<GuestWithCasts[]>([]);
    const [partySize, setPartySize] = useState(1);
    const [selectedTableId, setSelectedTableId] = useState<string>("");

    // モーダル状態
    const [isGuestSelectorOpen, setIsGuestSelectorOpen] = useState(false);
    const [isCastSelectorOpen, setIsCastSelectorOpen] = useState(false);
    const [currentGuestForCast, setCurrentGuestForCast] = useState<GuestWithCasts | null>(null);

    // モーダルが開いたときにキャストとゲスト一覧を取得
    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            Promise.all([
                getCastsForStore(storeId),
                getGuestsForStore(storeId),
                getTablesForStore(storeId),
            ]).then(([castsResult, guestsResult, tablesResult]) => {
                if (castsResult.success) {
                    setCasts(castsResult.casts);
                }
                if (guestsResult.success) {
                    setGuests(guestsResult.guests);
                }
                if (tablesResult.success) {
                    setTables(tablesResult.tables);
                }
                setLoading(false);
            });

            // 今日の日付をデフォルトに設定
            const today = new Date().toLocaleDateString("ja-JP", {
                timeZone: "Asia/Tokyo",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).replace(/\//g, "-");
            setReservationDate(today);
        }
    }, [isOpen, storeId]);

    // ゲスト数が変わったら人数を自動計算
    useEffect(() => {
        if (selectedGuests.length > 0) {
            setPartySize(Math.max(selectedGuests.length, partySize));
        }
    }, [selectedGuests.length]);

    const resetForm = () => {
        setSelectedGuests([]);
        setPartySize(1);
        setReservationDate("");
        setReservationTime("19:00");
        setSelectedTableId("");
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleGuestConfirm = (guests: SelectedGuest[]) => {
        // 既存のキャスト情報を保持しつつ更新
        const newSelectedGuests: GuestWithCasts[] = guests.map((g) => {
            const existing = selectedGuests.find((sg) => sg.id === g.id);
            return {
                ...g,
                casts: existing?.casts || [],
            };
        });
        setSelectedGuests(newSelectedGuests);
    };

    const handleCastConfirm = (casts: SelectedCast[]) => {
        if (!currentGuestForCast) return;
        setSelectedGuests(
            selectedGuests.map((g) =>
                g.id === currentGuestForCast.id ? { ...g, casts } : g
            )
        );
        setCurrentGuestForCast(null);
    };

    const openCastSelectorForGuest = (guest: GuestWithCasts) => {
        setCurrentGuestForCast(guest);
        setIsCastSelectorOpen(true);
    };

    const handleSubmit = () => {
        if (selectedGuests.length === 0 || !reservationDate || !reservationTime) {
            return;
        }

        startTransition(async () => {
            const result = await addReservationV2({
                storeId,
                reservationDate,
                reservationTime,
                partySize,
                tableId: selectedTableId || null,
                guests: selectedGuests.map((g) => ({
                    guestId: g.id,
                    casts: g.casts.map((c) => ({
                        castId: c.id,
                        nominationType: c.nomination_type,
                    })),
                })),
            });

            if (result.success && result.reservation) {
                onSuccess(result.reservation);
                handleClose();
            } else if (result.error) {
                console.error("予約追加エラー:", result.error);
            }
        });
    };

    const isValid = selectedGuests.length > 0 && reservationDate && reservationTime;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="space-y-1.5">
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
                            予約を追加
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        {/* 予約日 */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                予約日 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={reservationDate}
                                onChange={(e) => setReservationDate(e.target.value)}
                                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:ring-offset-gray-950 dark:placeholder:text-gray-400"
                            />
                        </div>

                        {/* 予約時間 */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                予約時間 <span className="text-red-500">*</span>
                            </label>
                            <Select value={reservationTime} onValueChange={setReservationTime}>
                                <SelectTrigger className="h-10 rounded-lg">
                                    <SelectValue placeholder="時間を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {timeOptions.map((time) => (
                                        <SelectItem key={time} value={time}>
                                            {time}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 席番号 */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                席番号
                            </label>
                            <Select value={selectedTableId || "none"} onValueChange={(v) => setSelectedTableId(v === "none" ? "" : v)}>
                                <SelectTrigger className="h-10 rounded-lg">
                                    <SelectValue placeholder="未指定" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">未指定</SelectItem>
                                    {tables.map((table) => (
                                        <SelectItem key={table.id} value={table.id}>
                                            {table.name} ({table.capacity}名)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* ゲスト選択 */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                ゲスト <span className="text-red-500">*</span>
                            </label>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-start h-10 rounded-lg"
                                onClick={() => setIsGuestSelectorOpen(true)}
                                disabled={loading}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                {loading ? "読み込み中..." : "ゲストを選択"}
                            </Button>

                            {/* 選択済みゲストリスト */}
                            {selectedGuests.length > 0 && (
                                <div className="space-y-2 mt-2">
                                    {selectedGuests.map((guest) => (
                                        <div
                                            key={guest.id}
                                            className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-gray-500" />
                                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {guest.display_name}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedGuests(
                                                            selectedGuests.filter((g) => g.id !== guest.id)
                                                        )
                                                    }
                                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>

                                            {/* キャスト */}
                                            <div className="flex flex-wrap gap-1">
                                                {guest.casts.map((cast) => (
                                                    <span
                                                        key={cast.id}
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${NOMINATION_TYPE_COLORS[cast.nomination_type]}`}
                                                    >
                                                        {cast.display_name}
                                                        <span className="opacity-70">
                                                            ({NOMINATION_TYPE_LABELS[cast.nomination_type]})
                                                        </span>
                                                    </span>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => openCastSelectorForGuest(guest)}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                    キャスト
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 人数 */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                人数
                            </label>
                            <Input
                                type="number"
                                min={selectedGuests.length || 1}
                                max={20}
                                value={partySize}
                                onChange={(e) => setPartySize(Math.max(selectedGuests.length || 1, parseInt(e.target.value, 10) || 1))}
                                className="h-10 rounded-lg"
                            />
                            {partySize > selectedGuests.length && selectedGuests.length > 0 && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {partySize - selectedGuests.length}名の名無しゲストが自動生成されます
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="mt-6 flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isPending || !isValid}
                            className="rounded-lg"
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "追加"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ゲスト選択モーダル */}
            <GuestSelectorModal
                isOpen={isGuestSelectorOpen}
                onClose={() => setIsGuestSelectorOpen(false)}
                guests={guests}
                selectedGuests={selectedGuests}
                onConfirm={handleGuestConfirm}
            />

            {/* キャスト選択モーダル */}
            <CastSelectorModal
                isOpen={isCastSelectorOpen}
                onClose={() => {
                    setIsCastSelectorOpen(false);
                    setCurrentGuestForCast(null);
                }}
                casts={casts}
                selectedCasts={currentGuestForCast?.casts || []}
                onConfirm={handleCastConfirm}
                guestName={currentGuestForCast?.display_name}
            />
        </>
    );
}
