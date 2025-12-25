"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, User, X, ChevronLeft } from "lucide-react";
import { addReservationV2, getCastsForStore, getGuestsForStore, getTablesForStore, getCustomFields, updateCustomAnswers, type CustomField } from "./actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { GuestSelectorModal, SelectedGuest } from "@/components/selectors/guest-selector-modal";
import { CastSelectorModal, SelectedCast, NominationType } from "@/components/selectors/cast-selector-modal";
import { useGlobalLoading } from "@/components/global-loading";
import { toast } from "@/components/ui/use-toast";

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
    settings?: {
        reservation_enabled: boolean;
        reservation_email_setting: "hidden" | "optional" | "required";
        reservation_phone_setting: "hidden" | "optional" | "required";
        reservation_cast_selection_enabled: boolean;
    };
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
    settings,
}: ReservationAddModalProps) {
    const castSelectionEnabled = settings?.reservation_cast_selection_enabled ?? true;
    const emailSetting = settings?.reservation_email_setting ?? "hidden";
    const phoneSetting = settings?.reservation_phone_setting ?? "hidden";
    const showEmailField = emailSetting !== "hidden";
    const showPhoneField = phoneSetting !== "hidden";

    const { showLoading, hideLoading } = useGlobalLoading();
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
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    // モーダル状態
    const [isGuestSelectorOpen, setIsGuestSelectorOpen] = useState(false);
    const [isCastSelectorOpen, setIsCastSelectorOpen] = useState(false);
    const [currentGuestForCast, setCurrentGuestForCast] = useState<GuestWithCasts | null>(null);

    // カスタム質問関連
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

    // モーダルが開いたときにキャストとゲスト一覧を取得
    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            Promise.all([
                getCastsForStore(storeId),
                getGuestsForStore(storeId),
                getTablesForStore(storeId),
                getCustomFields(storeId),
            ]).then(([castsResult, guestsResult, tablesResult, fieldsResult]) => {
                if (castsResult.success) {
                    setCasts(castsResult.casts);
                }
                if (guestsResult.success) {
                    setGuests(guestsResult.guests);
                }
                if (tablesResult.success) {
                    setTables(tablesResult.tables);
                }
                if (fieldsResult.success) {
                    setCustomFields(fieldsResult.fields);
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
        setEmail("");
        setPhone("");
        setCustomAnswers({});
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

    const handleSubmit = async () => {
        if (!reservationDate || !reservationTime) {
            return;
        }
        // 必須チェック
        if (emailSetting === "required" && !email) {
            toast({ title: "エラー", description: "メールアドレスを入力してください", variant: "destructive" });
            return;
        }
        if (phoneSetting === "required" && !phone) {
            toast({ title: "エラー", description: "電話番号を入力してください", variant: "destructive" });
            return;
        }

        showLoading("作成中...");
        try {
            const result = await addReservationV2({
                storeId,
                reservationDate,
                reservationTime,
                partySize,
                tableId: selectedTableId || null,
                email: email || undefined,
                phone: phone || undefined,
                guests: selectedGuests.map((g) => ({
                    guestId: g.id,
                    casts: g.casts.map((c) => ({
                        castId: c.id,
                        nominationType: c.nomination_type,
                    })),
                })),
            });

            if (result.success && result.reservation) {
                // カスタム回答を保存
                const answersArray = Object.entries(customAnswers).map(([fieldId, value]) => ({
                    fieldId,
                    value,
                }));
                if (answersArray.length > 0) {
                    await updateCustomAnswers(result.reservation.id, answersArray);
                }
                onSuccess(result.reservation);
                handleClose();
            } else if (result.error) {
                toast({
                    title: "エラー",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "エラー",
                description: "予約の作成に失敗しました",
                variant: "destructive",
            });
        } finally {
            hideLoading();
        }
    };

    const isValid = reservationDate && reservationTime;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent className="sm:max-w-md w-[95%] p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl bg-white dark:bg-gray-900">
                    <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                            予約を追加
                        </DialogTitle>
                        <div className="w-8 h-8" />
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {/* 予約日 */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                予約日 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={reservationDate}
                                onChange={(e) => setReservationDate(e.target.value)}
                                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base ring-offset-white file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:ring-offset-gray-950 dark:placeholder:text-gray-400"
                            />
                        </div>

                        {/* 予約時間 */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                予約時間 <span className="text-red-500">*</span>
                            </label>
                            <Select value={reservationTime} onValueChange={setReservationTime}>
                                <SelectTrigger className="h-10">
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
                                <SelectTrigger className="h-10">
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

                        {/* メールアドレス */}
                        {showEmailField && (
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                    メールアドレス {emailSetting === "required" && <span className="text-red-500">*</span>}
                                </label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="example@email.com"
                                    className="h-10 rounded-lg"
                                />
                            </div>
                        )}

                        {/* 電話番号 */}
                        {showPhoneField && (
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                    電話番号 {phoneSetting === "required" && <span className="text-red-500">*</span>}
                                </label>
                                <Input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="090-1234-5678"
                                    className="h-10 rounded-lg"
                                />
                            </div>
                        )}

                        {/* ゲスト選択 */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                ゲスト
                            </label>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-start h-10 rounded-lg"
                                onClick={() => setIsGuestSelectorOpen(true)}
                                disabled={loading}
                            >
                                <Plus className="h-5 w-5 mr-2" />
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
                                                    <X className="h-5 w-5" />
                                                </button>
                                            </div>

                                            {/* キャスト */}
                                            {castSelectionEnabled && (
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
                                            )}
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

                        {/* カスタム質問 */}
                        {customFields.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                    カスタム質問
                                </label>
                                {customFields.map((field) => (
                                    <div key={field.id} className="space-y-1.5">
                                        <label className="block text-sm text-gray-600 dark:text-gray-300">
                                            {field.label}
                                            {field.is_required && <span className="text-red-500 ml-1">*</span>}
                                        </label>
                                        {field.field_type === "text" && (
                                            <Input
                                                value={customAnswers[field.id] || ""}
                                                onChange={(e) => setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))}
                                                placeholder={field.label}
                                                className="h-10 rounded-lg"
                                            />
                                        )}
                                        {field.field_type === "textarea" && (
                                            <Textarea
                                                value={customAnswers[field.id] || ""}
                                                onChange={(e) => setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))}
                                                placeholder={field.label}
                                                className="min-h-[80px] rounded-lg"
                                            />
                                        )}
                                        {field.field_type === "select" && (
                                            <Select
                                                value={customAnswers[field.id] || ""}
                                                onValueChange={(v) => setCustomAnswers((prev) => ({ ...prev, [field.id]: v }))}
                                            >
                                                <SelectTrigger className="h-10">
                                                    <SelectValue placeholder="選択してください" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {field.options?.map((option) => (
                                                        <SelectItem key={option} value={option}>
                                                            {option}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        {field.field_type === "checkbox" && (
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`custom-field-${field.id}`}
                                                    checked={customAnswers[field.id] === "true"}
                                                    onCheckedChange={(checked) => setCustomAnswers((prev) => ({ ...prev, [field.id]: checked ? "true" : "false" }))}
                                                />
                                                <label
                                                    htmlFor={`custom-field-${field.id}`}
                                                    className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer"
                                                >
                                                    はい
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-col gap-2 pt-4">
                            <Button
                                onClick={handleSubmit}
                                disabled={!isValid}
                                className="w-full"
                            >
                                追加
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleClose}
                                className="w-full"
                            >
                                キャンセル
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ゲスト選択モーダル */}
            <GuestSelectorModal
                isOpen={isGuestSelectorOpen}
                onClose={() => setIsGuestSelectorOpen(false)}
                guests={guests}
                selectedGuests={selectedGuests}
                onConfirm={handleGuestConfirm}
                storeId={storeId}
                onGuestCreated={async () => {
                    // Refresh guest list after creating a new guest
                    const result = await getGuestsForStore(storeId);
                    if (result.success) {
                        setGuests(result.guests);
                    }
                }}
            />

            {/* キャスト選択モーダル */}
            {castSelectionEnabled && (
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
            )}
        </>
    );
}
