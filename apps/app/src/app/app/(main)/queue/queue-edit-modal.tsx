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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, ChevronLeft, Loader2, Mail, Phone, Send } from "lucide-react";
import {
    getQueueEntryDetail,
    updateQueueEntry,
    updateQueueCustomAnswers,
    deleteQueueEntry,
    getQueueCustomFields,
    getCastsForQueue,
    sendQueueNotification,
    type QueueCustomField,
} from "./actions";
import type { QueueEntry, QueueStatus } from "./types";

interface Cast {
    id: string;
    display_name: string;
    status?: string | null;
}

interface QueueEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
    entryId: string;
    onSuccess: (entryId: string, updates: { status?: QueueStatus; guestName?: string; partySize?: number }) => void;
    onDelete?: () => void;
}

export function QueueEditModal({
    isOpen,
    onClose,
    storeId,
    entryId,
    onSuccess,
    onDelete,
}: QueueEditModalProps) {
    const { showLoading, hideLoading } = useGlobalLoading();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [hasUserEdited, setHasUserEdited] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const autoSaveRef = useRef<(() => Promise<void>) | undefined>(undefined);

    // Form state
    const [guestName, setGuestName] = useState("");
    const [partySize, setPartySize] = useState(1);
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [nominatedCastId, setNominatedCastId] = useState("");
    const [status, setStatus] = useState<QueueStatus>("waiting");

    // Custom fields
    const [customFields, setCustomFields] = useState<QueueCustomField[]>([]);
    const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

    // Casts
    const [casts, setCasts] = useState<Cast[]>([]);

    // Delete confirm
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Load data when modal opens
    useEffect(() => {
        if (isOpen && entryId) {
            setLoading(true);
            Promise.all([
                getQueueEntryDetail(entryId),
                getQueueCustomFields(storeId),
                getCastsForQueue(storeId),
            ]).then(([detailResult, fieldsResult, castsResult]) => {
                if (detailResult.success && detailResult.entry) {
                    const e = detailResult.entry;
                    setGuestName(e.guest_name || "");
                    setPartySize(e.party_size || 1);
                    setEmail(e.email || e.contact_value || "");
                    setPhone(e.phone || "");
                    setNominatedCastId(e.nominated_cast_id || "");
                    setStatus(e.status || "waiting");

                    // Set custom answers
                    const answers: Record<string, string> = {};
                    detailResult.answers?.forEach((a: any) => {
                        answers[a.field_id] = a.answer_value;
                    });
                    setCustomAnswers(answers);
                }
                if (fieldsResult.success) {
                    setCustomFields(fieldsResult.fields);
                }
                if (castsResult.success) {
                    setCasts(castsResult.casts);
                }
                setLoading(false);
                setTimeout(() => setIsInitialized(true), 100);
            });
        }
    }, [isOpen, entryId, storeId]);

    const resetForm = () => {
        setGuestName("");
        setPartySize(1);
        setEmail("");
        setPhone("");
        setNominatedCastId("");
        setStatus("waiting");
        setCustomFields([]);
        setCustomAnswers({});
        setCasts([]);
        setShowDeleteConfirm(false);
        setIsInitialized(false);
        setHasUserEdited(false);
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    // Auto-save function
    const autoSave = useCallback(async () => {
        if (!guestName.trim()) {
            return;
        }

        showLoading("保存中...");

        try {
            // Update entry
            const result = await updateQueueEntry({
                entryId,
                guestName: guestName.trim(),
                partySize,
                email: email || null,
                phone: phone || null,
                nominatedCastId: nominatedCastId || null,
                status,
            });

            if (!result.success) {
                console.error("Queue entry update error:", result.error);
                toast({
                    title: "エラー",
                    description: "更新に失敗しました",
                    variant: "destructive",
                });
                return;
            }

            // Update custom answers
            const answersArray = Object.entries(customAnswers).map(([fieldId, value]) => ({
                fieldId,
                value,
            }));
            await updateQueueCustomAnswers(entryId, answersArray);

            onSuccess(entryId, { status, guestName: guestName.trim(), partySize });
        } finally {
            hideLoading();
        }
    }, [entryId, guestName, partySize, email, phone, nominatedCastId, status, customAnswers, showLoading, hideLoading, onSuccess]);

    // Keep autoSaveRef updated
    useEffect(() => {
        autoSaveRef.current = autoSave;
    }, [autoSave]);

    // Debounced auto-save
    useEffect(() => {
        if (!isInitialized || !hasUserEdited) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            autoSaveRef.current?.();
        }, 800);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [isInitialized, hasUserEdited, guestName, partySize, email, phone, nominatedCastId, status, customAnswers]);

    const handleDelete = async () => {
        setIsDeleting(true);
        const result = await deleteQueueEntry(entryId);
        setIsDeleting(false);

        if (result.success) {
            // まず全てのモーダルを閉じる
            setShowDeleteConfirm(false);
            resetForm();
            onClose();
            // 親のコールバックはモーダルが閉じた後に実行
            setTimeout(() => onDelete?.(), 50);
        } else {
            toast({
                title: "エラー",
                description: "削除に失敗しました",
                variant: "destructive",
            });
        }
    };

    const handleSendNotificationEmail = async () => {
        if (!email) {
            toast({
                title: "エラー",
                description: "メールアドレスが設定されていません",
                variant: "destructive",
            });
            return;
        }

        setIsSendingEmail(true);
        const result = await sendQueueNotification(entryId);
        setIsSendingEmail(false);

        if (result.success) {
            setStatus("waiting");
            toast({ title: "通知メールを送信しました" });
            onSuccess(entryId, { status: "waiting" });
        } else {
            toast({
                title: "エラー",
                description: result.error || "送信に失敗しました",
                variant: "destructive",
            });
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
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                            順番待ちを編集
                        </DialogTitle>
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
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
                            {/* Status toggle buttons */}
                            <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => { setStatus("waiting"); setHasUserEdited(true); }}
                                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                                        status === "waiting"
                                            ? "bg-yellow-500 text-white"
                                            : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    順番待ち
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setStatus("visited"); setHasUserEdited(true); }}
                                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                                        status === "visited"
                                            ? "bg-green-500 text-white"
                                            : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    来店済み
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setStatus("cancelled"); setHasUserEdited(true); }}
                                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                                        status === "cancelled"
                                            ? "bg-red-500 text-white"
                                            : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    キャンセル
                                </button>
                            </div>

                            <div className="border-t border-gray-200 dark:border-gray-700" />

                            {/* Send notification email button */}
                            {email && (
                                <button
                                    type="button"
                                    onClick={handleSendNotificationEmail}
                                    disabled={isSendingEmail}
                                    className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors disabled:opacity-50"
                                >
                                    {isSendingEmail ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <Send className="h-5 w-5" />
                                    )}
                                    <span className="text-sm font-medium">
                                        {isSendingEmail ? "送信中..." : "通知メールを送信"}
                                    </span>
                                </button>
                            )}

                            {/* Action buttons: Email and Phone */}
                            {(email || phone) && (
                                <div className="flex gap-2">
                                    {email && (
                                        <a
                                            href={`mailto:${email}`}
                                            className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                        >
                                            <Mail className="h-5 w-5" />
                                            <span className="text-sm font-medium">メール送信</span>
                                        </a>
                                    )}
                                    {phone && (
                                        <a
                                            href={`tel:${phone}`}
                                            className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                        >
                                            <Phone className="h-5 w-5" />
                                            <span className="text-sm font-medium">電話発信</span>
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Guest name */}
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                    お名前 <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    value={guestName}
                                    onChange={(e) => { setGuestName(e.target.value); setHasUserEdited(true); }}
                                    placeholder="山田 太郎"
                                    className="h-10 rounded-lg"
                                />
                            </div>

                            {/* Party size */}
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                    人数
                                </label>
                                <Select value={String(partySize)} onValueChange={(v) => { setPartySize(parseInt(v, 10)); setHasUserEdited(true); }}>
                                    <SelectTrigger className="h-10 rounded-lg">
                                        <SelectValue placeholder="人数を選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                            <SelectItem key={num} value={String(num)}>
                                                {num}名
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                    メールアドレス
                                </label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setHasUserEdited(true); }}
                                    placeholder="example@mail.com"
                                    className="h-10 rounded-lg"
                                />
                            </div>

                            {/* Phone */}
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

                            {/* Nominated cast */}
                            {casts.length > 0 && (
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                        指名キャスト
                                    </label>
                                    <Select value={nominatedCastId || "none"} onValueChange={(v) => { setNominatedCastId(v === "none" ? "" : v); setHasUserEdited(true); }}>
                                        <SelectTrigger className="h-10 rounded-lg">
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

                            {/* Custom fields */}
                            {customFields.length > 0 && (
                                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        カスタム質問
                                    </p>

                                    {customFields.map((field) => (
                                        <div key={field.id} className="space-y-1.5">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                                {field.label}
                                                {field.is_required && <span className="text-red-500"> *</span>}
                                            </label>

                                            {field.field_type === "text" && (
                                                <Input
                                                    value={customAnswers[field.id] || ""}
                                                    onChange={(e) => {
                                                        setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.value }));
                                                        setHasUserEdited(true);
                                                    }}
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
                                                    rows={3}
                                                    className="rounded-lg"
                                                />
                                            )}

                                            {field.field_type === "select" && field.options && (
                                                <Select
                                                    value={customAnswers[field.id] || ""}
                                                    onValueChange={(v) => {
                                                        setCustomAnswers((prev) => ({ ...prev, [field.id]: v }));
                                                        setHasUserEdited(true);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-10 rounded-lg">
                                                        <SelectValue placeholder="選択してください" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {field.options.map((option) => (
                                                            <SelectItem key={option} value={option}>
                                                                {option}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}

                                            {field.field_type === "checkbox" && (
                                                <div className="flex items-center gap-2 py-2">
                                                    <Checkbox
                                                        id={`custom-${field.id}`}
                                                        checked={customAnswers[field.id] === "true"}
                                                        onCheckedChange={(checked) => {
                                                            setCustomAnswers((prev) => ({ ...prev, [field.id]: checked ? "true" : "" }));
                                                            setHasUserEdited(true);
                                                        }}
                                                    />
                                                    <label
                                                        htmlFor={`custom-${field.id}`}
                                                        className="text-sm text-gray-700 dark:text-gray-200 cursor-pointer"
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

            {/* Delete confirm modal */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
                            順番待ちを削除
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        この順番待ちを削除しますか？この操作は取り消せません。
                    </p>
                    <DialogFooter className="flex justify-end gap-2 mt-4">
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
