"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Plus, Trash2, X, ChevronRight } from "lucide-react";
import { useGlobalLoading } from "@/components/global-loading";
import { toast } from "@/components/ui/use-toast";
import {
    updateReservationSettings,
    getCustomFields,
    createCustomField,
    updateCustomField,
    deleteCustomField,
    type CustomField,
} from "./actions";

type ContactSetting = "hidden" | "optional" | "required";
type FieldType = "text" | "textarea" | "select" | "checkbox";

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
    text: "1行テキスト",
    textarea: "複数行テキスト",
    select: "選択肢",
    checkbox: "チェックボックス",
};

interface ReservationSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
    initialSettings: {
        reservation_enabled: boolean;
        reservation_email_setting: ContactSetting;
        reservation_phone_setting: ContactSetting;
        reservation_cast_selection_enabled: boolean;
    };
}

export function ReservationSettingsModal({
    isOpen,
    onClose,
    storeId,
    initialSettings,
}: ReservationSettingsModalProps) {
    const queryClient = useQueryClient();
    const { showLoading, hideLoading } = useGlobalLoading();
    const [isEnabled, setIsEnabled] = useState(initialSettings.reservation_enabled);
    const [emailSetting, setEmailSetting] = useState<ContactSetting>(initialSettings.reservation_email_setting);
    const [phoneSetting, setPhoneSetting] = useState<ContactSetting>(initialSettings.reservation_phone_setting);
    const [castSelectionEnabled, setCastSelectionEnabled] = useState(initialSettings.reservation_cast_selection_enabled);
    const isInitialMount = useRef(true);

    // カスタム質問関連の状態
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [isLoadingFields, setIsLoadingFields] = useState(false);
    const [editingField, setEditingField] = useState<CustomField | null>(null);
    const [isAddMode, setIsAddMode] = useState(false);

    // フォーム用の状態
    const [formLabel, setFormLabel] = useState("");
    const [formType, setFormType] = useState<FieldType>("text");
    const [formRequired, setFormRequired] = useState(false);
    const [formOptions, setFormOptions] = useState<string[]>([]);
    const [newOption, setNewOption] = useState("");
    const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null);

    // カスタム質問を読み込む
    const loadCustomFields = useCallback(async () => {
        setIsLoadingFields(true);
        const result = await getCustomFields(storeId);
        if (result.success) {
            setCustomFields(result.fields);
        }
        setIsLoadingFields(false);
    }, [storeId]);

    useEffect(() => {
        if (isOpen) {
            loadCustomFields();
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

    const startEditField = (field: CustomField) => {
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
                result = await updateCustomField({
                    fieldId: editingField.id,
                    label: formLabel.trim(),
                    fieldType: formType,
                    isRequired: formRequired,
                    options: formType === "select" ? formOptions : null,
                });
            } else {
                result = await createCustomField({
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
            await deleteCustomField(deleteFieldId);
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

    const saveSettings = useCallback(async () => {
        showLoading("保存中...");
        try {
            await updateReservationSettings(storeId, {
                reservation_enabled: isEnabled,
                reservation_email_setting: emailSetting,
                reservation_phone_setting: phoneSetting,
                reservation_cast_selection_enabled: castSelectionEnabled,
            });
            await queryClient.invalidateQueries({ queryKey: ["reservations"] });
        } catch {
            toast({
                title: "エラー",
                description: "設定の保存に失敗しました",
                variant: "destructive",
            });
        } finally {
            hideLoading();
        }
    }, [storeId, isEnabled, emailSetting, phoneSetting, castSelectionEnabled, queryClient, showLoading, hideLoading]);

    // デバウンスで自動保存
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const timer = setTimeout(() => {
            saveSettings();
        }, 800);

        return () => clearTimeout(timer);
    }, [isEnabled, emailSetting, phoneSetting, castSelectionEnabled, saveSettings]);

    // 質問編集画面の場合
    if (isEditingField) {
        return (
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-sm p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl bg-white dark:bg-gray-900">
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
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        ) : (
                            <div className="w-8 h-8" />
                        )}
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {/* ラベル */}
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

                        {/* 回答タイプ */}
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

                        {/* 選択肢（selectタイプのみ） */}
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

                        {/* 必須設定 */}
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-700 dark:text-gray-200">
                                必須にする
                            </span>
                            <Switch
                                checked={formRequired}
                                onCheckedChange={setFormRequired}
                            />
                        </div>

                        {/* 保存ボタン */}
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
            <DialogContent className="sm:max-w-sm p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-2xl bg-white dark:bg-gray-900">
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
                        予約設定
                    </DialogTitle>
                    <div className="w-8 h-8" />
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* 有効/無効切り替え */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                予約機能を有効にする
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                有効にするとゲストが来店予約できます
                            </p>
                        </div>
                        <Switch
                            checked={isEnabled}
                            onCheckedChange={setIsEnabled}
                        />
                    </div>

                    {/* 連絡先設定（有効時のみ表示） */}
                    {isEnabled && (
                        <>
                            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    連絡先の入力設定
                                </p>

                                {/* メールアドレス設定 */}
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-700 dark:text-gray-200">
                                        メールアドレス
                                    </p>
                                    <div className="flex gap-2">
                                        {(["hidden", "optional", "required"] as const).map((option) => (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => setEmailSetting(option)}
                                                className={`flex-1 py-2 px-3 text-xs rounded-lg border transition-colors ${
                                                    emailSetting === option
                                                        ? "bg-blue-500 text-white border-blue-500"
                                                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                }`}
                                            >
                                                {option === "hidden" ? "非表示" : option === "optional" ? "任意" : "必須"}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 電話番号設定 */}
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-700 dark:text-gray-200">
                                        電話番号
                                    </p>
                                    <div className="flex gap-2">
                                        {(["hidden", "optional", "required"] as const).map((option) => (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => setPhoneSetting(option)}
                                                className={`flex-1 py-2 px-3 text-xs rounded-lg border transition-colors ${
                                                    phoneSetting === option
                                                        ? "bg-blue-500 text-white border-blue-500"
                                                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                }`}
                                            >
                                                {option === "hidden" ? "非表示" : option === "optional" ? "任意" : "必須"}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 指名キャスト設定 */}
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-700 dark:text-gray-200">
                                        指名キャスト選択
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCastSelectionEnabled(false)}
                                            className={`flex-1 py-2 px-3 text-xs rounded-lg border transition-colors ${
                                                !castSelectionEnabled
                                                    ? "bg-blue-500 text-white border-blue-500"
                                                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                            }`}
                                        >
                                            非表示
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCastSelectionEnabled(true)}
                                            className={`flex-1 py-2 px-3 text-xs rounded-lg border transition-colors ${
                                                castSelectionEnabled
                                                    ? "bg-blue-500 text-white border-blue-500"
                                                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                            }`}
                                        >
                                            表示(任意)
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* カスタム質問セクション */}
                            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
