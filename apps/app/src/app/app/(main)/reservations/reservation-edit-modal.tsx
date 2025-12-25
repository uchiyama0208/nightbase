"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useGlobalLoading } from "@/components/global-loading";
import { toast } from "@/components/ui/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, User, X, Trash2, ChevronLeft, Copy, Check, Loader2, Mail, Phone } from "lucide-react";
import {
    updateReservationV2,
    updateUrlReservation,
    deleteReservation,
    getCastsForStore,
    getGuestsForStore,
    getTablesForStore,
    getReservationDetail,
    getCustomFields,
    getCustomAnswers,
    updateCustomAnswers,
    updateReservationStatus,
    type CustomField,
} from "./actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { GuestSelectorModal, SelectedGuest } from "@/components/selectors/guest-selector-modal";
import { CastSelectorModal, SelectedCast, NominationType } from "@/components/selectors/cast-selector-modal";

interface Profile {
    id: string;
    display_name: string;
    status?: string | null;
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
    onSuccess: (reservationId?: string, updates?: Record<string, unknown>) => void;
    onDelete?: () => void;
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

export function ReservationEditModal({
    isOpen,
    onClose,
    storeId,
    reservationId,
    onSuccess,
    onDelete,
    settings,
}: ReservationEditModalProps) {
    const emailSetting = settings?.reservation_email_setting ?? "hidden";
    const phoneSetting = settings?.reservation_phone_setting ?? "hidden";
    const showEmailField = emailSetting !== "hidden";
    const showPhoneField = phoneSetting !== "hidden";

    const { showLoading, hideLoading } = useGlobalLoading();
    const [isDeleting, setIsDeleting] = useState(false);
    const [casts, setCasts] = useState<Profile[]>([]);
    const [guests, setGuests] = useState<Profile[]>([]);
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [hasUserEdited, setHasUserEdited] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const autoSaveRef = useRef<(() => Promise<void>) | undefined>(undefined);

    // フォーム状態
    const [reservationDate, setReservationDate] = useState("");
    const [reservationTime, setReservationTime] = useState("19:00");
    const [selectedGuests, setSelectedGuests] = useState<GuestWithCasts[]>([]);
    const [partySize, setPartySize] = useState(1);
    const [selectedTableId, setSelectedTableId] = useState<string>("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

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

    // カスタム質問関連
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

    // ステータス関連
    const [status, setStatus] = useState<"waiting" | "visited" | "cancelled">("waiting");
    const [isStatusUpdating, setIsStatusUpdating] = useState(false);

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
                getCustomFields(storeId),
                getCustomAnswers(reservationId),
            ]).then(([castsResult, guestsResult, tablesResult, reservationResult, fieldsResult, answersResult]) => {
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
                    setStatus(r.status || "waiting");

                    // 連絡先情報を設定
                    if (r.contact_type === "email" && r.contact_value) {
                        setEmail(r.contact_value);
                        setPhone("");
                    } else if (r.contact_type === "phone" && r.contact_value) {
                        setPhone(r.contact_value);
                        setEmail("");
                    }

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
                // カスタム質問フィールドを設定
                if (fieldsResult.success) {
                    setCustomFields(fieldsResult.fields);
                }
                // カスタム質問の回答を設定
                if (answersResult.success) {
                    const answersMap: Record<string, string> = {};
                    answersResult.answers.forEach((a: any) => {
                        answersMap[a.field_id] = a.answer_value;
                    });
                    setCustomAnswers(answersMap);
                }
                setLoading(false);
                // 初期化完了フラグを少し遅延させて設定（初期値セット後に自動保存が走らないように）
                setTimeout(() => setIsInitialized(true), 100);
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
        setEmail("");
        setPhone("");
        setShowDeleteConfirm(false);
        setIsUrlReservation(false);
        setGuestName("");
        setGuestNameKana("");
        setContactType("email");
        setContactValue("");
        setNominatedCastId("");
        setCopied(false);
        setIsInitialized(false);
        setHasUserEdited(false);
        setCustomFields([]);
        setCustomAnswers({});
        setStatus("waiting");
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
    };

    // ステータス切り替えハンドラー（楽観的UI）
    const handleStatusChange = async (newStatus: "waiting" | "visited" | "cancelled") => {
        if (status === newStatus) return;

        const previousStatus = status;

        // 楽観的に即座にUIを更新
        setStatus(newStatus);
        onSuccess(reservationId, { status: newStatus });

        // バックグラウンドでAPI呼び出し
        const result = await updateReservationStatus(reservationId, newStatus);
        if (!result.success) {
            // 失敗時は元に戻す
            setStatus(previousStatus);
            onSuccess(reservationId, { status: previousStatus });
            toast({
                title: "エラー",
                description: "ステータスの更新に失敗しました",
                variant: "destructive",
            });
        }
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
        setHasUserEdited(true);
    };

    const handleCastConfirm = (casts: SelectedCast[]) => {
        if (!currentGuestForCast) return;
        setSelectedGuests(
            selectedGuests.map((g) =>
                g.id === currentGuestForCast.id ? { ...g, casts } : g
            )
        );
        setCurrentGuestForCast(null);
        setHasUserEdited(true);
    };

    const openCastSelectorForGuest = (guest: GuestWithCasts) => {
        setCurrentGuestForCast(guest);
        setIsCastSelectorOpen(true);
    };

    // 自動保存関数
    const autoSave = useCallback(async () => {
        if (!reservationDate || !reservationTime) {
            return;
        }

        showLoading("保存中...");

        try {
            if (isUrlReservation) {
                // URL経由の予約
                if (!guestName) {
                    hideLoading();
                    return;
                }

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
                    // カスタム回答も保存
                    const answersArray = Object.entries(customAnswers).map(([fieldId, value]) => ({
                        fieldId,
                        value,
                    }));
                    await updateCustomAnswers(reservationId, answersArray);
                    onSuccess();
                } else if (result.error) {
                    console.error("予約更新エラー:", result.error);
                    toast({
                        title: "エラー",
                        description: "予約の更新に失敗しました",
                        variant: "destructive",
                    });
                }
            } else {
                // 管理画面からの予約
                if (selectedGuests.length === 0) {
                    hideLoading();
                    return;
                }

                const result = await updateReservationV2({
                    reservationId,
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

                if (result.success) {
                    // カスタム回答も保存
                    const answersArray = Object.entries(customAnswers).map(([fieldId, value]) => ({
                        fieldId,
                        value,
                    }));
                    await updateCustomAnswers(reservationId, answersArray);
                    onSuccess();
                } else if (result.error) {
                    console.error("予約更新エラー:", result.error);
                    toast({
                        title: "エラー",
                        description: "予約の更新に失敗しました",
                        variant: "destructive",
                    });
                }
            }
        } finally {
            hideLoading();
        }
    }, [
        reservationId,
        reservationDate,
        reservationTime,
        partySize,
        selectedTableId,
        isUrlReservation,
        guestName,
        guestNameKana,
        contactType,
        contactValue,
        nominatedCastId,
        selectedGuests,
        customAnswers,
        showLoading,
        hideLoading,
        onSuccess,
    ]);

    // autoSaveRefを常に最新に保つ
    useEffect(() => {
        autoSaveRef.current = autoSave;
    }, [autoSave]);

    // デバウンスによる自動保存
    useEffect(() => {
        if (!isInitialized || !hasUserEdited) return;

        // 既存のタイマーをクリア
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // 800msデバウンスで自動保存
        saveTimeoutRef.current = setTimeout(() => {
            autoSaveRef.current?.();
        }, 800);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [
        isInitialized,
        hasUserEdited,
        reservationDate,
        reservationTime,
        partySize,
        selectedTableId,
        email,
        phone,
        guestName,
        guestNameKana,
        nominatedCastId,
        selectedGuests,
        customAnswers,
    ]);

    const handleDelete = async () => {
        setIsDeleting(true);
        const result = await deleteReservation(reservationId);
        setIsDeleting(false);

        if (result.success) {
            onDelete?.();
            handleClose();
        } else if (result.error) {
            console.error("予約削除エラー:", result.error);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent className="sm:max-w-md w-[95%] p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl bg-white dark:bg-gray-900">
                    <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                            予約を編集
                        </DialogTitle>
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-red-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-gray-700 transition-colors"
                            title="削除"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </DialogHeader>

                    {loading ? (
                        <div className="flex-1 flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {/* ステータス切り替えボタン */}
                            <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => handleStatusChange("waiting")}
                                    disabled={isStatusUpdating}
                                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                                        status === "waiting"
                                            ? "bg-yellow-500 text-white"
                                            : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    予約
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleStatusChange("visited")}
                                    disabled={isStatusUpdating}
                                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                                        status === "visited"
                                            ? "bg-green-500 text-white"
                                            : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    来店済
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleStatusChange("cancelled")}
                                    disabled={isStatusUpdating}
                                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                                        status === "cancelled"
                                            ? "bg-red-500 text-white"
                                            : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    キャンセル
                                </button>
                            </div>

                            {/* 連絡先アクションボタン */}
                            {(email || phone || contactValue) && (
                                <div className="flex gap-2">
                                    {(email || (contactType === "email" && contactValue)) && (
                                        <a
                                            href={`mailto:${email || contactValue}`}
                                            className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                        >
                                            <Mail className="h-5 w-5" />
                                            <span className="text-sm font-medium">メール送信</span>
                                        </a>
                                    )}
                                    {(phone || (contactType === "phone" && contactValue)) && (
                                        <a
                                            href={`tel:${phone || contactValue}`}
                                            className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                        >
                                            <Phone className="h-5 w-5" />
                                            <span className="text-sm font-medium">電話発信</span>
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* 予約日 */}
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                    予約日 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={reservationDate}
                                    onChange={(e) => { setReservationDate(e.target.value); setHasUserEdited(true); }}
                                    className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base ring-offset-white file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:ring-offset-gray-950 dark:placeholder:text-gray-400"
                                />
                            </div>

                            {/* 予約時間 */}
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                    予約時間 <span className="text-red-500">*</span>
                                </label>
                                <Select value={reservationTime} onValueChange={(v) => { setReservationTime(v); setHasUserEdited(true); }}>
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
                                <Select value={selectedTableId || "none"} onValueChange={(v) => { setSelectedTableId(v === "none" ? "" : v); setHasUserEdited(true); }}>
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

                            {/* メールアドレス（管理画面予約のみ） */}
                            {!isUrlReservation && (
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                        メールアドレス
                                    </label>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setHasUserEdited(true); }}
                                        placeholder="example@email.com"
                                        className="h-10 rounded-lg"
                                    />
                                </div>
                            )}

                            {/* 電話番号（管理画面予約のみ） */}
                            {!isUrlReservation && (
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                        電話番号
                                    </label>
                                    <Input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => { setPhone(e.target.value); setHasUserEdited(true); }}
                                        placeholder="090-1234-5678"
                                        className="h-10 rounded-lg"
                                    />
                                </div>
                            )}

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
                                            onChange={(e) => { setGuestName(e.target.value); setHasUserEdited(true); }}
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
                                            onChange={(e) => { setGuestNameKana(e.target.value); setHasUserEdited(true); }}
                                            placeholder="おなまえ"
                                            className="h-10 rounded-lg"
                                        />
                                    </div>

                                    {/* メールアドレス */}
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                            メールアドレス
                                        </label>
                                        <Input
                                            type="email"
                                            value={contactType === "email" ? contactValue : email}
                                            onChange={(e) => {
                                                if (contactType === "email") {
                                                    setContactValue(e.target.value);
                                                } else {
                                                    setEmail(e.target.value);
                                                }
                                                setHasUserEdited(true);
                                            }}
                                            placeholder="example@email.com"
                                            className="h-10 rounded-lg"
                                        />
                                    </div>

                                    {/* 電話番号 */}
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                            電話番号
                                        </label>
                                        <Input
                                            type="tel"
                                            value={contactType === "phone" ? contactValue : phone}
                                            onChange={(e) => {
                                                if (contactType === "phone") {
                                                    setContactValue(e.target.value);
                                                } else {
                                                    setPhone(e.target.value);
                                                }
                                                setHasUserEdited(true);
                                            }}
                                            placeholder="090-1234-5678"
                                            className="h-10 rounded-lg"
                                        />
                                    </div>

                                    {/* 指名キャスト */}
                                    {casts.length > 0 && (
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                                指名キャスト
                                            </label>
                                            <Select value={nominatedCastId || "none"} onValueChange={(v) => { setNominatedCastId(v === "none" ? "" : v); setHasUserEdited(true); }}>
                                                <SelectTrigger className="h-10">
                                                    <SelectValue placeholder="指名なし" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">指名なし</SelectItem>
                                                    {casts.map((cast) => (
                                                        <SelectItem key={cast.id} value={cast.id}>
                                                            {cast.display_name}
                                                            {cast.status === "体入" && (
                                                                <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                                                    体入
                                                                </span>
                                                            )}
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
                                            <Plus className="h-5 w-5 mr-2" />
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
                                                                onClick={() => {
                                                                    setSelectedGuests(
                                                                        selectedGuests.filter((g) => g.id !== guest.id)
                                                                    );
                                                                    setHasUserEdited(true);
                                                                }}
                                                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                            >
                                                                <X className="h-5 w-5" />
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
                                    onChange={(e) => { setPartySize(Math.max(isUrlReservation ? 1 : (selectedGuests.length || 1), parseInt(e.target.value, 10) || 1)); setHasUserEdited(true); }}
                                    className="h-10 rounded-lg"
                                />
                                {!isUrlReservation && partySize > selectedGuests.length && selectedGuests.length > 0 && (
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
                                                    onChange={(e) => {
                                                        setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.value }));
                                                        setHasUserEdited(true);
                                                    }}
                                                    placeholder={field.label}
                                                    className="h-10 rounded-lg"
                                                />
                                            )}
                                            {field.field_type === "textarea" && (
                                                <Textarea
                                                    value={customAnswers[field.id] || ""}
                                                    onChange={(e) => {
                                                        setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.value }));
                                                        setHasUserEdited(true);
                                                    }}
                                                    placeholder={field.label}
                                                    className="min-h-[80px] rounded-lg"
                                                />
                                            )}
                                            {field.field_type === "select" && (
                                                <Select
                                                    value={customAnswers[field.id] || ""}
                                                    onValueChange={(v) => {
                                                        setCustomAnswers((prev) => ({ ...prev, [field.id]: v }));
                                                        setHasUserEdited(true);
                                                    }}
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
                                                        onCheckedChange={(checked) => {
                                                            setCustomAnswers((prev) => ({ ...prev, [field.id]: checked ? "true" : "false" }));
                                                            setHasUserEdited(true);
                                                        }}
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
                        </div>
                    )}
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
                <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
                            予約を削除
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        この予約を削除しますか？この操作は取り消せません。
                    </p>
                    <DialogFooter className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(false)}
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
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
