"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import {
    updateQueueSettings,
    getQueueCustomFields,
    createQueueCustomField,
    updateQueueCustomField,
    deleteQueueCustomField,
    type QueueCustomField,
} from "./actions";
import type { QueueSettings, ContactSetting } from "./types";
import { useGlobalLoading } from "@/components/global-loading";
import { toast } from "@/components/ui/use-toast";

type FieldType = "text" | "textarea" | "select" | "checkbox";

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
    text: "1行テキスト",
    textarea: "複数行テキスト",
    select: "選択肢",
    checkbox: "チェックボックス",
};

interface QueueSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
    storeName: string;
    initialSettings: QueueSettings;
    onSettingsChange?: (settings: QueueSettings) => void;
}

const contactSettingOptions: { value: ContactSetting; label: string }[] = [
    { value: "hidden", label: "非表示" },
    { value: "optional", label: "任意" },
    { value: "required", label: "必須" },
];

export function QueueSettingsModal({
    isOpen,
    onClose,
    storeId,
    storeName,
    initialSettings,
    onSettingsChange,
}: QueueSettingsModalProps) {
    const [isEnabled, setIsEnabled] = useState(initialSettings.queue_enabled);
    const [message, setMessage] = useState(initialSettings.queue_notification_message);
    const [emailSetting, setEmailSetting] = useState<ContactSetting>(initialSettings.queue_email_setting);
    const [phoneSetting, setPhoneSetting] = useState<ContactSetting>(initialSettings.queue_phone_setting);
    const [castSetting, setCastSetting] = useState<ContactSetting>(initialSettings.queue_cast_setting);
    const [hasUserEdited, setHasUserEdited] = useState(false);
    const autoSaveRef = useRef<(() => Promise<void>) | null>(null);
    const { showLoading, hideLoading } = useGlobalLoading();

    // Custom fields state
    const [customFields, setCustomFields] = useState<QueueCustomField[]>([]);
    const [isLoadingFields, setIsLoadingFields] = useState(false);
    const [editingField, setEditingField] = useState<QueueCustomField | null>(null);
    const [isAddMode, setIsAddMode] = useState(false);

    // Field form state
    const [formLabel, setFormLabel] = useState("");
    const [formType, setFormType] = useState<FieldType>("text");
    const [formRequired, setFormRequired] = useState(false);
    const [formOptions, setFormOptions] = useState<string[]>([]);
    const [newOption, setNewOption] = useState("");
    const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null);

    // Load custom fields
    const loadCustomFields = useCallback(async () => {
        setIsLoadingFields(true);
        const result = await getQueueCustomFields(storeId);
        if (result.success) {
            setCustomFields(result.fields);
        }
        setIsLoadingFields(false);
    }, [storeId]);

    useEffect(() => {
        if (isOpen) {
            loadCustomFields();
            setHasUserEdited(false);
        }
    }, [isOpen, loadCustomFields]);

    const resetFieldForm = () => {
        setFormLabel("");
        setFormType("text");
        setFormRequired(false);
        setFormOptions([]);
        setNewOption("");
        setEditingField(null);
        setIsAddMode(false);
    };

    const startAddField = () => {
        resetFieldForm();
        setIsAddMode(true);
    };

    const startEditField = (field: QueueCustomField) => {
        setEditingField(field);
        setFormLabel(field.label);
        setFormType(field.field_type);
        setFormRequired(field.is_required);
        setFormOptions(field.options || []);
        setIsAddMode(false);
    };

    const handleAddOption = () => {
        if (newOption.trim() && !formOptions.includes(newOption.trim())) {
            setFormOptions([...formOptions, newOption.trim()]);
            setNewOption("");
        }
    };

    const handleRemoveOption = (index: number) => {
        setFormOptions(formOptions.filter((_, i) => i !== index));
    };

    const handleSaveField = async () => {
        if (!formLabel.trim()) {
            toast({
                title: "エラー",
                description: "ラベルを入力してください",
                variant: "destructive",
            });
            return;
        }

        if (formType === "select" && formOptions.length < 2) {
            toast({
                title: "エラー",
                description: "選択肢は2つ以上必要です",
                variant: "destructive",
            });
            return;
        }

        showLoading("保存中...");
        try {
            let result;
            if (editingField) {
                result = await updateQueueCustomField({
                    fieldId: editingField.id,
                    label: formLabel.trim(),
                    fieldType: formType,
                    isRequired: formRequired,
                    options: formType === "select" ? formOptions : null,
                });
            } else {
                result = await createQueueCustomField({
                    storeId,
                    label: formLabel.trim(),
                    fieldType: formType,
                    isRequired: formRequired,
                    options: formType === "select" ? formOptions : undefined,
                });
            }

            if (!result.success) {
                console.error("Save field error:", result.error);
                toast({
                    title: "エラー",
                    description: result.error || "保存に失敗しました",
                    variant: "destructive",
                });
                return;
            }

            await loadCustomFields();
            resetFieldForm();
            toast({ title: "保存しました" });
        } catch (e) {
            console.error("Save field exception:", e);
            toast({
                title: "エラー",
                description: "保存に失敗しました",
                variant: "destructive",
            });
        } finally {
            hideLoading();
        }
    };

    const handleDeleteField = async () => {
        if (!deleteFieldId) return;

        showLoading("削除中...");
        try {
            await deleteQueueCustomField(deleteFieldId);
            await loadCustomFields();
            resetFieldForm();
            setDeleteFieldId(null);
            toast({ title: "削除しました" });
        } catch {
            toast({
                title: "エラー",
                description: "削除に失敗しました",
                variant: "destructive",
            });
        } finally {
            hideLoading();
        }
    };

    const isEditingField = editingField !== null || isAddMode;

    // Auto-save function
    const autoSave = useCallback(async () => {
        showLoading("保存中...");
        try {
            const newSettings: QueueSettings = {
                queue_enabled: isEnabled,
                queue_notification_message: message,
                queue_email_setting: emailSetting,
                queue_phone_setting: phoneSetting,
                queue_cast_setting: castSetting,
            };
            const result = await updateQueueSettings(storeId, newSettings);
            if (result.success) {
                onSettingsChange?.(newSettings);
            } else {
                toast({ title: "保存に失敗しました", variant: "destructive" });
            }
        } catch {
            toast({ title: "保存に失敗しました", variant: "destructive" });
        } finally {
            hideLoading();
        }
    }, [storeId, isEnabled, message, emailSetting, phoneSetting, castSetting, showLoading, hideLoading, onSettingsChange]);

    // Update autoSaveRef
    useEffect(() => {
        autoSaveRef.current = autoSave;
    }, [autoSave]);

    // Debounced auto-save
    useEffect(() => {
        if (!hasUserEdited) return;

        const timer = setTimeout(() => {
            autoSaveRef.current?.();
        }, 800);
        return () => clearTimeout(timer);
    }, [isEnabled, message, emailSetting, phoneSetting, castSetting, hasUserEdited]);

    // Field editing screen
    if (isEditingField) {
        return (
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 bg-white p-0 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                        <button
                            type="button"
                            onClick={resetFieldForm}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {editingField ? "質問を編集" : "質問を追加"}
                        </DialogTitle>
                        {editingField ? (
                            <button
                                type="button"
                                onClick={() => setDeleteFieldId(editingField.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                                aria-label="削除"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        ) : (
                            <div className="w-8 h-8" />
                        )}
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        {/* Label */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                質問ラベル <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={formLabel}
                                onChange={(e) => setFormLabel(e.target.value)}
                                placeholder="例: ご来店のきっかけ"
                                className="rounded-lg"
                            />
                        </div>

                        {/* Answer type */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                回答タイプ
                            </label>
                            <Select
                                value={formType}
                                onValueChange={(v) => setFormType(v as FieldType)}
                            >
                                <SelectTrigger className="rounded-lg">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Options (select type only) */}
                        {formType === "select" && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                    選択肢
                                </label>
                                <div className="space-y-2">
                                    {formOptions.map((option, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input
                                                value={option}
                                                readOnly
                                                className="rounded-lg flex-1"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOption(index)}
                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={newOption}
                                            onChange={(e) => setNewOption(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleAddOption();
                                                }
                                            }}
                                            placeholder="選択肢を入力"
                                            className="rounded-lg flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAddOption}
                                            className="rounded-lg"
                                        >
                                            追加
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Required toggle */}
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-700 dark:text-gray-200">
                                必須にする
                            </span>
                            <Switch
                                checked={formRequired}
                                onCheckedChange={setFormRequired}
                            />
                        </div>

                        {/* Save button */}
                        <div className="pt-4 pb-2">
                            <Button
                                onClick={handleSaveField}
                                className="w-full rounded-lg"
                            >
                                保存
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 bg-white p-0 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        順番待ち設定
                    </DialogTitle>
                    <div className="w-8 h-8" />
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                    {/* Enable/disable toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                順番待ち機能を有効にする
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                有効にするとゲストが順番待ち登録できます
                            </p>
                        </div>
                        <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => {
                                setIsEnabled(checked);
                                setHasUserEdited(true);
                            }}
                        />
                    </div>

                    {/* Contact settings - only show when enabled */}
                    {isEnabled && (
                        <>
                            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    連絡先の入力設定
                                </p>

                                {/* Email setting */}
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-700 dark:text-gray-200">
                                        メールアドレス
                                    </p>
                                    <div className="flex gap-2">
                                        {contactSettingOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => {
                                                    setEmailSetting(option.value);
                                                    setHasUserEdited(true);
                                                }}
                                                className={`flex-1 py-2 px-3 text-xs rounded-lg border transition-colors ${
                                                    emailSetting === option.value
                                                        ? "bg-blue-500 text-white border-blue-500"
                                                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Phone setting */}
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-700 dark:text-gray-200">
                                        電話番号
                                    </p>
                                    <div className="flex gap-2">
                                        {contactSettingOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => {
                                                    setPhoneSetting(option.value);
                                                    setHasUserEdited(true);
                                                }}
                                                className={`flex-1 py-2 px-3 text-xs rounded-lg border transition-colors ${
                                                    phoneSetting === option.value
                                                        ? "bg-blue-500 text-white border-blue-500"
                                                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Cast setting */}
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-700 dark:text-gray-200">
                                        指名キャスト
                                    </p>
                                    <div className="flex gap-2">
                                        {contactSettingOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => {
                                                    setCastSetting(option.value);
                                                    setHasUserEdited(true);
                                                }}
                                                className={`flex-1 py-2 px-3 text-xs rounded-lg border transition-colors ${
                                                    castSetting === option.value
                                                        ? "bg-blue-500 text-white border-blue-500"
                                                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Notification email (only if email is enabled) */}
                            {emailSetting !== "hidden" && (
                                <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                        通知メール
                                    </label>
                                    <Textarea
                                        value={message}
                                        onChange={(e) => {
                                            setMessage(e.target.value);
                                            setHasUserEdited(true);
                                        }}
                                        placeholder="お待たせいたしました。まもなくご案内できます。"
                                        className="min-h-[100px] rounded-lg border-gray-200 bg-white
                                                   focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0
                                                   dark:border-gray-700 dark:bg-gray-800"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        ゲストに通知を送る際に使用されます
                                    </p>
                                </div>
                            )}

                            {/* Custom questions section */}
                            <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    カスタム質問
                                </p>

                                {isLoadingFields ? (
                                    <div className="flex items-center justify-center py-4">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {customFields.length === 0 ? (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                                                カスタム質問はありません
                                            </p>
                                        ) : (
                                            customFields.map((field) => (
                                                <button
                                                    key={field.id}
                                                    type="button"
                                                    onClick={() => startEditField(field)}
                                                    className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm text-gray-900 dark:text-white truncate">
                                                            {field.label}
                                                            {field.is_required && (
                                                                <span className="text-red-500 ml-1">*</span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {FIELD_TYPE_LABELS[field.field_type]}
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                </button>
                                            ))
                                        )}

                                        <button
                                            type="button"
                                            onClick={startAddField}
                                            className="w-full flex items-center justify-center gap-1 p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <Plus className="h-4 w-4" />
                                            <span className="text-sm">質問を追加</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>

            <DeleteConfirmDialog
                open={!!deleteFieldId}
                onOpenChange={(open) => !open && setDeleteFieldId(null)}
                itemName="この質問"
                onConfirm={handleDeleteField}
            />
        </Dialog>
    );
}
