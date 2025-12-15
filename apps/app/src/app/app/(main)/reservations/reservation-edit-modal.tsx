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
import { Loader2, Plus, User, X, Trash2, ChevronLeft, Copy, Check } from "lucide-react";
import {
    updateReservationV2,
    updateUrlReservation,
    deleteReservation,
    getCastsForStore,
    getGuestsForStore,
    getTablesForStore,
    getReservationDetail,
} from "./actions";
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

interface ReservationEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
    reservationId: string;
    onSuccess: () => void;
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

export function ReservationEditModal({
    isOpen,
    onClose,
    storeId,
    reservationId,
    onSuccess,
}: ReservationEditModalProps) {
    const [isPending, startTransition] = useTransition();
    const [isDeleting, setIsDeleting] = useState(false);
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

    // URL経由予約の場合のゲスト情報（profiles未登録）
    const [isUrlReservation, setIsUrlReservation] = useState(false);
    const [guestName, setGuestName] = useState("");
    const [guestNameKana, setGuestNameKana] = useState("");
    const [contactType, setContactType] = useState<"email" | "phone">("email");
    const [contactValue, setContactValue] = useState("");
    const [nominatedCastId, setNominatedCastId] = useState<string>("");

    // モーダル状態
    const [isGuestSelectorOpen, setIsGuestSelectorOpen] = useState(false);
    const [isCastSelectorOpen, setIsCastSelectorOpen] = useState(false);
    const [currentGuestForCast, setCurrentGuestForCast] = useState<GuestWithCasts | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyContact = async () => {
        if (contactValue) {
            await navigator.clipboard.writeText(contactValue);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // モーダルが開いたときにデータを取得
    useEffect(() => {
        if (isOpen && reservationId) {
            setLoading(true);
            Promise.all([
                getCastsForStore(storeId),
                getGuestsForStore(storeId),
                getTablesForStore(storeId),
                getReservationDetail(reservationId),
            ]).then(([castsResult, guestsResult, tablesResult, reservationResult]) => {
                if (castsResult.success) {
                    setCasts(castsResult.casts);
                }
                if (guestsResult.success) {
                    setGuests(guestsResult.guests);
                }
                if (tablesResult.success) {
                    setTables(tablesResult.tables);
                }
                if (reservationResult.success && reservationResult.reservation) {
                    const r = reservationResult.reservation;
                    setReservationDate(r.reservation_date);
                    setReservationTime(r.reservation_time?.slice(0, 5) || "19:00");
                    setPartySize(r.party_size || 1);
                    setSelectedTableId(r.table_id || "");

                    // ゲストとキャストを設定
                    if (r.guests && r.guests.length > 0) {
                        // 管理画面から追加した予約（profiles紐づけあり）
                        setIsUrlReservation(false);
                        setSelectedGuests(r.guests.map((g: any) => ({
                            id: g.id,
                            display_name: g.display_name,
                            casts: g.casts || [],
                        })));
                    } else {
                        // URL経由の予約（profiles紐づけなし）
                        setIsUrlReservation(true);
                        setGuestName(r.guest_name || "");
                        setGuestNameKana(r.guest_name_kana || "");
                        setContactType(r.contact_type || "email");
                        setContactValue(r.contact_value || "");
                        setNominatedCastId(r.nominated_cast_id || "");
                        setSelectedGuests([]);
                    }
                }
                setLoading(false);
            });
        }
    }, [isOpen, storeId, reservationId]);

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
        setShowDeleteConfirm(false);
        setIsUrlReservation(false);
        setGuestName("");
        setGuestNameKana("");
        setContactType("email");
        setContactValue("");
        setNominatedCastId("");
        setCopied(false);
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
        if (!reservationDate || !reservationTime) {
            return;
        }

        if (isUrlReservation) {
            // URL経由の予約
            if (!guestName) return;

            startTransition(async () => {
                const result = await updateUrlReservation({
                    reservationId,
                    reservationDate,
                    reservationTime,
                    partySize,
                    tableId: selectedTableId || null,
                    guestName,
                    guestNameKana,
                    contactType,
                    contactValue,
                    nominatedCastId: nominatedCastId || null,
                });

                if (result.success) {
                    onSuccess();
                    handleClose();
                } else if (result.error) {
                    console.error("予約更新エラー:", result.error);
                }
            });
        } else {
            // 管理画面からの予約
            if (selectedGuests.length === 0) return;

            startTransition(async () => {
                const result = await updateReservationV2({
                    reservationId,
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

                if (result.success) {
                    onSuccess();
                    handleClose();
                } else if (result.error) {
                    console.error("予約更新エラー:", result.error);
                }
            });
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        const result = await deleteReservation(reservationId);
        setIsDeleting(false);

        if (result.success) {
            onSuccess();
            handleClose();
        } else if (result.error) {
            console.error("予約削除エラー:", result.error);
        }
    };

    const isValid = reservationDate && reservationTime && (
        isUrlReservation ? guestName.trim() !== "" : selectedGuests.length > 0
    );

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
                                予約を編集
                            </DialogTitle>
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                title="削除"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </DialogHeader>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                    ) : (
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

                            {/* ゲスト情報 */}
                            {isUrlReservation ? (
                                <>
                                    {/* URL経由予約: ゲスト名をInputで表示 */}
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                            ゲスト名 <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            value={guestName}
                                            onChange={(e) => setGuestName(e.target.value)}
                                            placeholder="お名前"
                                            className="h-10 rounded-lg"
                                        />
                                    </div>

                                    {/* ゲスト名（ひらがな） */}
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                            ゲスト名（ひらがな）
                                        </label>
                                        <Input
                                            value={guestNameKana}
                                            onChange={(e) => setGuestNameKana(e.target.value)}
                                            placeholder="おなまえ"
                                            className="h-10 rounded-lg"
                                        />
                                    </div>

                                    {/* 連絡先（読み取り専用＋コピー可能） */}
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                            {contactType === "phone" ? "電話番号" : "メールアドレス"}
                                        </label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 h-10 px-3 flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100">
                                                {contactValue || "-"}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-10 w-10 rounded-lg shrink-0"
                                                onClick={handleCopyContact}
                                                disabled={!contactValue}
                                            >
                                                {copied ? (
                                                    <Check className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* 指名キャスト */}
                                    {casts.length > 0 && (
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                                指名キャスト
                                            </label>
                                            <Select value={nominatedCastId || "none"} onValueChange={(v) => setNominatedCastId(v === "none" ? "" : v)}>
                                                <SelectTrigger className="h-10 rounded-lg">
                                                    <SelectValue placeholder="指名なし" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">指名なし</SelectItem>
                                                    {casts.map((cast) => (
                                                        <SelectItem key={cast.id} value={cast.id}>
                                                            {cast.display_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* 管理画面予約: ゲスト選択 */}
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                            ゲスト <span className="text-red-500">*</span>
                                        </label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full justify-start h-10 rounded-lg"
                                            onClick={() => setIsGuestSelectorOpen(true)}
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            ゲストを選択
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
                                </>
                            )}

                            {/* 人数 */}
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                    人数
                                </label>
                                <Input
                                    type="number"
                                    min={isUrlReservation ? 1 : (selectedGuests.length || 1)}
                                    max={20}
                                    value={partySize}
                                    onChange={(e) => setPartySize(Math.max(isUrlReservation ? 1 : (selectedGuests.length || 1), parseInt(e.target.value, 10) || 1))}
                                    className="h-10 rounded-lg"
                                />
                                {!isUrlReservation && partySize > selectedGuests.length && selectedGuests.length > 0 && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {partySize - selectedGuests.length}名の名無しゲストが自動生成されます
                                    </p>
                                )}
                            </div>

                        </div>
                    )}

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
                            disabled={isPending || !isValid || loading}
                            className="rounded-lg"
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "保存"
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

            {/* 削除確認モーダル */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
                            予約を削除
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        この予約を削除しますか？この操作は取り消せません。
                    </p>
                    <DialogFooter className="mt-6 flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="rounded-lg"
                        >
                            {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "削除する"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
