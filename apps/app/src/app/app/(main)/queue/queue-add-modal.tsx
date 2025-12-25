"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Loader2, ChevronLeft } from "lucide-react";
import { addQueueEntry, getQueueCustomFields, getCastsForQueue, type QueueCustomField } from "./actions";
import type { QueueEntry, QueueSettings } from "./types";

interface Cast {
    id: string;
    display_name: string;
    status?: string;
}

interface QueueAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
    settings: QueueSettings;
    onSuccess: (entry: QueueEntry) => void;
}

export function QueueAddModal({
    isOpen,
    onClose,
    storeId,
    settings,
    onSuccess,
}: QueueAddModalProps) {
    const [isPending, startTransition] = useTransition();
    const [guestName, setGuestName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [nominatedCastId, setNominatedCastId] = useState("__none__");
    const [partySize, setPartySize] = useState(1);
    const [customFields, setCustomFields] = useState<QueueCustomField[]>([]);
    const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
    const [casts, setCasts] = useState<Cast[]>([]);
    const [isLoadingFields, setIsLoadingFields] = useState(false);

    // Settings-based visibility
    const showEmail = settings.queue_email_setting !== "hidden";
    const showPhone = settings.queue_phone_setting !== "hidden";
    const showCast = settings.queue_cast_setting !== "hidden";
    const emailRequired = settings.queue_email_setting === "required";
    const phoneRequired = settings.queue_phone_setting === "required";
    const castRequired = settings.queue_cast_setting === "required";

    const loadData = useCallback(async () => {
        setIsLoadingFields(true);
        const [fieldsResult, castsResult] = await Promise.all([
            getQueueCustomFields(storeId),
            showCast ? getCastsForQueue(storeId) : Promise.resolve({ success: true, casts: [] }),
        ]);
        if (fieldsResult.success) {
            setCustomFields(fieldsResult.fields);
        }
        if (castsResult.success) {
            setCasts(castsResult.casts);
        }
        setIsLoadingFields(false);
    }, [storeId, showCast]);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, loadData]);

    const resetForm = () => {
        setGuestName("");
        setEmail("");
        setPhone("");
        setNominatedCastId("__none__");
        setPartySize(1);
        setCustomAnswers({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleCustomAnswerChange = (fieldId: string, value: string) => {
        setCustomAnswers((prev) => ({ ...prev, [fieldId]: value }));
    };

    const handleSubmit = () => {
        if (!guestName.trim()) return;

        // Validate required fields
        if (emailRequired && !email.trim()) return;
        if (phoneRequired && !phone.trim()) return;
        if (castRequired && !nominatedCastId) return;

        // Validate required custom fields
        for (const field of customFields) {
            if (field.is_required) {
                const value = customAnswers[field.id];
                if (!value || value.trim() === "") {
                    return;
                }
            }
        }

        startTransition(async () => {
            const answers = Object.entries(customAnswers)
                .map(([fieldId, value]) => ({ fieldId, value }));

            // Determine contact value and type
            const contactValue = email.trim() || phone.trim();
            const contactType = email.trim() ? "email" as const : "phone" as const;

            const result = await addQueueEntry({
                storeId,
                guestName: guestName.trim(),
                contactValue,
                contactType,
                partySize,
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                nominatedCastId: nominatedCastId && nominatedCastId !== "__none__" ? nominatedCastId : undefined,
                customAnswers: answers,
            });

            if (result.success && result.entry) {
                const entry = result.entry;
                resetForm();
                onClose();
                // 親のコールバックはモーダルが閉じた後に実行
                setTimeout(() => onSuccess(entry), 50);
            }
        });
    };

    // For cast validation: "__none__" means "no nomination" was explicitly selected, which is valid
    // Empty string means nothing was selected yet (should not happen with default value)
    const isCastValid = !castRequired || nominatedCastId !== "";

    const isValid = guestName.trim() !== ""
        && (!emailRequired || email.trim() !== "")
        && (!phoneRequired || phone.trim() !== "")
        && isCastValid
        && customFields.every((field) => {
            if (!field.is_required) return true;
            const value = customAnswers[field.id];
            return value && value.trim() !== "";
        });

    const renderCustomField = (field: QueueCustomField) => {
        const value = customAnswers[field.id] || "";

        switch (field.field_type) {
            case "text":
                return (
                    <Input
                        value={value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCustomAnswerChange(field.id, e.target.value)}
                        className="h-10 rounded-lg"
                    />
                );
            case "textarea":
                return (
                    <Textarea
                        value={value}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleCustomAnswerChange(field.id, e.target.value)}
                        className="min-h-[80px] rounded-lg"
                    />
                );
            case "select":
                return (
                    <Select value={value} onValueChange={(v: string) => handleCustomAnswerChange(field.id, v)}>
                        <SelectTrigger className="h-10 rounded-lg">
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
                );
            case "checkbox":
                return (
                    <div className="flex items-center gap-2">
                        <Checkbox
                            checked={value === "true"}
                            onCheckedChange={(checked: boolean) => handleCustomAnswerChange(field.id, checked ? "true" : "")}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-200">はい</span>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && handleClose()}>
            <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 bg-white p-0 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-hidden flex flex-col">
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
                        順番待ちを追加
                    </DialogTitle>
                    <div className="w-8 h-8" />
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* お名前 */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            お名前 <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={guestName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGuestName(e.target.value)}
                            placeholder="山田 太郎"
                            className="h-10 rounded-lg"
                        />
                    </div>

                    {/* 人数 */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                            人数
                        </label>
                        <Select value={String(partySize)} onValueChange={(v: string) => setPartySize(parseInt(v, 10))}>
                            <SelectTrigger className="h-10">
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

                    {/* メールアドレス */}
                    {showEmail && (
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                メールアドレス
                                {emailRequired && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <Input
                                value={email}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                type="email"
                                placeholder="example@mail.com"
                                className="h-10 rounded-lg"
                            />
                        </div>
                    )}

                    {/* 電話番号 */}
                    {showPhone && (
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                電話番号
                                {phoneRequired && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <Input
                                value={phone}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                                type="tel"
                                placeholder="090-1234-5678"
                                className="h-10 rounded-lg"
                            />
                        </div>
                    )}

                    {/* 指名キャスト */}
                    {showCast && (
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                指名キャスト
                                {castRequired && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <Select value={nominatedCastId} onValueChange={(v: string) => setNominatedCastId(v)}>
                                <SelectTrigger className="h-10 rounded-lg">
                                    <SelectValue placeholder="選択してください" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">指名なし</SelectItem>
                                    {casts.map((cast) => (
                                        <SelectItem key={cast.id} value={cast.id}>
                                            {cast.display_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* カスタム質問 */}
                    {isLoadingFields ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        customFields.map((field) => (
                            <div key={field.id} className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {field.label}
                                    {field.is_required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                {renderCustomField(field)}
                            </div>
                        ))
                    )}

                    {/* ボタン - 縦一列 */}
                    <div className="flex flex-col gap-2 pt-4">
                        <Button
                            onClick={handleSubmit}
                            disabled={isPending || !isValid}
                            className="w-full"
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "追加"
                            )}
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
    );
}
