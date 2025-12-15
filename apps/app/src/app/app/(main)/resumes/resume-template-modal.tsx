"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Plus,
    Trash2,
    Copy,
    Check,
    Link as LinkIcon,
    ChevronLeft,
    ChevronUp,
    ChevronDown,
    Download,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
    createResumeTemplate,
    updateResumeTemplate,
    deleteResumeTemplate,
    addTemplateField,
    updateTemplateField,
    deleteTemplateField,
    updateFieldsOrder,
    generateSubmissionToken,
} from "./actions";

interface TemplateField {
    id: string;
    field_type: string;
    label: string;
    options: string[] | null;
    is_required: boolean;
    sort_order: number;
}

interface VisibleFields {
    name: boolean;
    name_kana: boolean;
    birth_date: boolean;
    phone_number: boolean;
    emergency_phone_number: boolean;
    desired_cast_name: boolean;
    zip_code: boolean;
    prefecture: boolean;
    city: boolean;
    street: boolean;
    building: boolean;
    past_employments: boolean;
}

const defaultVisibleFields: VisibleFields = {
    name: true,
    name_kana: true,
    birth_date: true,
    phone_number: true,
    emergency_phone_number: true,
    desired_cast_name: true,
    zip_code: true,
    prefecture: true,
    city: true,
    street: true,
    building: true,
    past_employments: true,
};

interface ResumeTemplate {
    id: string;
    name: string;
    is_active: boolean;
    target_role: "cast" | "staff";
    visible_fields?: VisibleFields;
    created_at: string;
    resume_template_fields: TemplateField[];
    resume_submissions: { count: number }[];
}

interface ResumeTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    template: ResumeTemplate | null;
    storeId: string;
    onCreated?: (template: ResumeTemplate) => void;
}

const fieldTypes = [
    { value: "text", label: "テキスト" },
    { value: "textarea", label: "長文テキスト" },
    { value: "number", label: "数値" },
    { value: "select", label: "選択肢" },
    { value: "checkbox", label: "チェックボックス" },
    { value: "date", label: "日付" },
];

export function ResumeTemplateModal({
    isOpen,
    onClose,
    template,
    storeId,
    onCreated,
}: ResumeTemplateModalProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDeleteFieldConfirm, setShowDeleteFieldConfirm] = useState(false);

    // Tab state for edit modal
    const [activeTab, setActiveTab] = useState<"edit" | "share">("edit");

    // Template form state
    const [name, setName] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [targetRole, setTargetRole] = useState<"cast" | "staff">("cast");
    const [visibleFields, setVisibleFields] = useState<VisibleFields>(defaultVisibleFields);

    // Fields state
    const [fields, setFields] = useState<TemplateField[]>([]);
    const [editingField, setEditingField] = useState<TemplateField | null>(null);
    const [isAddingField, setIsAddingField] = useState(false);

    // New field form state
    const [newFieldType, setNewFieldType] = useState("text");
    const [newFieldLabel, setNewFieldLabel] = useState("");
    const [newFieldOptions, setNewFieldOptions] = useState("");
    const [newFieldRequired, setNewFieldRequired] = useState(false);

    // URL copy state
    const [copiedUrl, setCopiedUrl] = useState(false);

    // QR Code ref
    const qrRef = useRef<HTMLDivElement>(null);

    // Tab refs for Vercel-style indicator
    const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    // Update indicator position when tab changes
    useEffect(() => {
        const activeButton = tabsRef.current[activeTab];
        if (activeButton) {
            setIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
            });
        }
    }, [activeTab]);

    useEffect(() => {
        if (template) {
            setName(template.name);
            setIsActive(template.is_active);
            setTargetRole(template.target_role || "cast");
            setVisibleFields(template.visible_fields || defaultVisibleFields);
            setFields(template.resume_template_fields || []);
        } else {
            setName("");
            setIsActive(true);
            setTargetRole("cast");
            setVisibleFields(defaultVisibleFields);
            setFields([]);
        }
        setIsAddingField(false);
        setEditingField(null);
        setActiveTab("edit");
        resetNewFieldForm();
    }, [template, isOpen]);

    const resetNewFieldForm = () => {
        setNewFieldType("text");
        setNewFieldLabel("");
        setNewFieldOptions("");
        setNewFieldRequired(false);
    };

    const handleSaveTemplate = async () => {
        if (!name.trim()) return;

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("targetRole", targetRole);
            formData.append("visibleFields", JSON.stringify(visibleFields));

            if (template) {
                formData.append("id", template.id);
                formData.append("isActive", String(isActive));
                await updateResumeTemplate(formData);
                router.refresh();
                onClose();
            } else {
                const newTemplate = await createResumeTemplate(formData) as any;
                toast({
                    title: "保存しました",
                });
                router.refresh();
                onClose();
                if (onCreated && newTemplate) {
                    // 新規作成後、編集モーダルを開く
                    onCreated({
                        id: newTemplate.id,
                        name: newTemplate.name,
                        is_active: newTemplate.is_active,
                        target_role: newTemplate.target_role,
                        visible_fields: newTemplate.visible_fields,
                        created_at: newTemplate.created_at,
                        resume_template_fields: [],
                        resume_submissions: [],
                    });
                }
            }
        } catch (error) {
            console.error("Failed to save template:", error);
            toast({
                title: "保存に失敗しました",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const toggleVisibleField = (field: keyof VisibleFields) => {
        setVisibleFields(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleDeleteTemplate = async () => {
        if (!template) return;

        setIsDeleting(true);
        try {
            await deleteResumeTemplate(template.id);
            router.refresh();
            onClose();
        } catch (error) {
            console.error("Failed to delete template:", error);
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleAddField = async () => {
        if (!template || !newFieldLabel.trim()) return;

        setIsLoading(true);
        try {
            const options = newFieldType === "select" && newFieldOptions.trim()
                ? newFieldOptions.split("\n").filter(o => o.trim())
                : undefined;

            const newField = await addTemplateField(template.id, {
                field_type: newFieldType,
                label: newFieldLabel,
                options,
                is_required: newFieldRequired,
                sort_order: fields.length,
            });

            // ローカルステートを更新
            if (newField) {
                setFields([...fields, newField as TemplateField]);
            }

            router.refresh();
            setIsAddingField(false);
            resetNewFieldForm();
        } catch (error) {
            console.error("Failed to add field:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateField = async () => {
        if (!editingField || !newFieldLabel.trim()) return;

        setIsLoading(true);
        try {
            const options = newFieldType === "select" && newFieldOptions.trim()
                ? newFieldOptions.split("\n").filter(o => o.trim())
                : undefined;

            await updateTemplateField(editingField.id, {
                field_type: newFieldType,
                label: newFieldLabel,
                options,
                is_required: newFieldRequired,
            });

            // ローカルステートを更新
            setFields(fields.map(f => f.id === editingField.id ? {
                ...f,
                field_type: newFieldType,
                label: newFieldLabel,
                options: options || null,
                is_required: newFieldRequired,
            } : f));

            router.refresh();
            setEditingField(null);
            resetNewFieldForm();
        } catch (error) {
            console.error("Failed to update field:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteField = async (fieldId: string) => {
        setIsLoading(true);
        try {
            await deleteTemplateField(fieldId);
            // ローカルステートを更新
            setFields(fields.filter(f => f.id !== fieldId));
            router.refresh();
        } catch (error) {
            console.error("Failed to delete field:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMoveField = async (index: number, direction: "up" | "down") => {
        if (direction === "up" && index === 0) return;
        if (direction === "down" && index === fields.length - 1) return;

        const newIndex = direction === "up" ? index - 1 : index + 1;
        const newFields = [...fields];
        const temp = newFields[index];
        newFields[index] = newFields[newIndex];
        newFields[newIndex] = temp;

        // ローカルステートを即座に更新
        setFields(newFields);

        // サーバーに順番を保存
        try {
            const fieldOrders = newFields.map((f, i) => ({
                id: f.id,
                sort_order: i,
            }));
            await updateFieldsOrder(fieldOrders);
            router.refresh();
        } catch (error) {
            console.error("Failed to update field order:", error);
            // エラー時は元に戻す
            setFields(fields);
        }
    };

    const handleEditFieldClick = (field: TemplateField) => {
        setEditingField(field);
        setNewFieldType(field.field_type);
        setNewFieldLabel(field.label);
        setNewFieldOptions(field.options?.join("\n") || "");
        setNewFieldRequired(field.is_required);
        setIsAddingField(false);
    };

    const getFormUrl = () => {
        if (!template) return "";
        return `${window.location.origin}/resume/${template.id}`;
    };

    const handleCopyUrl = async () => {
        if (!template) return;

        try {
            const url = getFormUrl();
            await navigator.clipboard.writeText(url);
            setCopiedUrl(true);
            setTimeout(() => setCopiedUrl(false), 2000);
        } catch (error) {
            console.error("Failed to copy URL:", error);
        }
    };

    const handleDownloadQR = () => {
        if (!qrRef.current || !template) return;

        const canvas = qrRef.current.querySelector("canvas");
        if (!canvas) return;

        const link = document.createElement("a");
        link.download = `${name || "履歴書フォーム"}_QRコード.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    const handleShareToLine = () => {
        if (!template) return;
        const url = getFormUrl();
        const text = `${name || "履歴書フォーム"}`;
        const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text + "\n" + url)}`;
        window.open(lineUrl, "_blank");
    };

    const renderFieldForm = () => (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-200">回答タイプ</Label>
                <Select value={newFieldType} onValueChange={setNewFieldType}>
                    <SelectTrigger className="rounded-lg">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[9999]">
                        {fieldTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                                {type.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-200">質問文</Label>
                <Input
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    placeholder="例: 身長を教えてください"
                    className="rounded-lg"
                />
            </div>

            {newFieldType === "select" && (
                <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-200">選択肢（1行に1つ）</Label>
                    <Textarea
                        value={newFieldOptions}
                        onChange={(e) => setNewFieldOptions(e.target.value)}
                        placeholder={"可能\n不可\n相談次第"}
                        className="rounded-lg min-h-[100px]"
                    />
                </div>
            )}

            <div className="flex items-center justify-between">
                <Label className="text-gray-700 dark:text-gray-200">必須項目</Label>
                <Switch
                    checked={newFieldRequired}
                    onCheckedChange={setNewFieldRequired}
                />
            </div>

            <div className="flex gap-2">
                <Button
                    variant="outline"
                    onClick={() => {
                        setIsAddingField(false);
                        setEditingField(null);
                        resetNewFieldForm();
                    }}
                    className="flex-1 rounded-lg"
                >
                    キャンセル
                </Button>
                <Button
                    onClick={editingField ? handleUpdateField : handleAddField}
                    disabled={isLoading || !newFieldLabel.trim()}
                    className="flex-1 rounded-lg"
                >
                    {isLoading ? "保存中..." : editingField ? "更新" : "追加"}
                </Button>
            </div>
        </div>
    );

    const renderFieldsList = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    カスタム質問 ({fields.length}件)
                </h3>
                <Button
                    size="sm"
                    onClick={() => {
                        setIsAddingField(true);
                        setEditingField(null);
                        resetNewFieldForm();
                    }}
                    className="rounded-lg"
                >
                    <Plus className="h-4 w-4 mr-1" />
                    追加
                </Button>
            </div>

            {fields.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p className="text-sm">カスタム質問がありません</p>
                    <p className="text-xs mt-1">追加ボタンから質問を追加してください</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {fields.map((field, index) => (
                        <div
                            key={field.id}
                            className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                            onClick={() => handleEditFieldClick(field)}
                        >
                            <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
                                <button
                                    type="button"
                                    onClick={() => handleMoveField(index, "up")}
                                    disabled={index === 0}
                                    className={`p-0.5 rounded ${index === 0 ? "text-gray-300 dark:text-gray-600" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
                                >
                                    <ChevronUp className="h-3 w-3" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleMoveField(index, "down")}
                                    disabled={index === fields.length - 1}
                                    className={`p-0.5 rounded ${index === fields.length - 1 ? "text-gray-300 dark:text-gray-600" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
                                >
                                    <ChevronDown className="h-3 w-3" />
                                </button>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {field.label}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {fieldTypes.find(t => t.value === field.field_type)?.label}
                                    {field.is_required && " • 必須"}
                                </p>
                            </div>
                            <ChevronLeft className="h-4 w-4 text-gray-400 rotate-180" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-lg rounded-2xl border border-gray-200 bg-white p-0 dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <DialogHeader className="flex flex-row items-center justify-between gap-2 px-6 py-4 mb-0 relative">
                        <button
                            type="button"
                            onClick={() => {
                                if (isAddingField || editingField) {
                                    setIsAddingField(false);
                                    setEditingField(null);
                                    resetNewFieldForm();
                                } else {
                                    onClose();
                                }
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white">
                            {isAddingField
                                ? "新しい質問を追加"
                                : editingField
                                ? "質問を編集"
                                : template
                                ? "フォーマット編集"
                                : "新規フォーマット作成"}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            履歴書フォーマットを編集します
                        </DialogDescription>
                        {template && !isAddingField && !editingField ? (
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                aria-label="削除"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        ) : editingField ? (
                            <button
                                type="button"
                                onClick={() => setShowDeleteFieldConfirm(true)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                aria-label="削除"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        ) : (
                            <div className="w-8 h-8" />
                        )}

                    </DialogHeader>

                    {/* Tab Navigation (only for existing templates and not in field edit mode) */}
                    {template && !isAddingField && !editingField && (
                        <div className="px-6 pb-4">
                            <div className="relative">
                                <div className="flex">
                                    <button
                                        ref={(el) => { tabsRef.current["edit"] = el; }}
                                        type="button"
                                        onClick={() => setActiveTab("edit")}
                                        className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                                            activeTab === "edit"
                                                ? "text-gray-900 dark:text-white"
                                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                        }`}
                                    >
                                        編集
                                    </button>
                                    <button
                                        ref={(el) => { tabsRef.current["share"] = el; }}
                                        type="button"
                                        onClick={() => setActiveTab("share")}
                                        className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                                            activeTab === "share"
                                                ? "text-gray-900 dark:text-white"
                                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                        }`}
                                    >
                                        共有
                                    </button>
                                </div>
                                <div
                                    className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-200"
                                    style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                                />
                                <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
                            </div>
                        </div>
                    )}

                    <div className="p-6 pt-0">
                        {(isAddingField || editingField) ? (
                            renderFieldForm()
                        ) : activeTab === "share" && template ? (
                            /* Share Tab Content */
                            <div className="space-y-4">
                                <div className="space-y-4">
                                    {/* QR Code Display */}
                                    <div className="flex justify-center">
                                        <div
                                            ref={qrRef}
                                            className="p-4 bg-white rounded-xl border border-gray-200 dark:border-gray-700"
                                        >
                                            <QRCodeCanvas
                                                value={getFormUrl()}
                                                size={180}
                                                level="H"
                                                marginSize={1}
                                            />
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                        QRコードをスキャンまたはURLを共有してください
                                    </p>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={handleDownloadQR}
                                            className="w-full rounded-lg"
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            QR保存
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={handleCopyUrl}
                                            className="w-full rounded-lg"
                                        >
                                            {copiedUrl ? (
                                                <>
                                                    <Check className="h-4 w-4 mr-2 text-green-500" />
                                                    コピー済み
                                                </>
                                            ) : (
                                                <>
                                                    <LinkIcon className="h-4 w-4 mr-2" />
                                                    URLコピー
                                                </>
                                            )}
                                        </Button>
                                        {/* LINE Share Button */}
                                        <Button
                                            onClick={handleShareToLine}
                                            className="w-full rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white"
                                        >
                                            <svg
                                                className="h-5 w-5 mr-2"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                            >
                                                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                                            </svg>
                                            LINEで共有
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Edit Tab Content */
                            <div className="space-y-4">
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-gray-700 dark:text-gray-200">履歴書名</Label>
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="例: キャスト用履歴書"
                                            className="rounded-lg"
                                        />
                                    </div>

                                    {!template && (
                                        <div className="space-y-2">
                                            <Label className="text-gray-700 dark:text-gray-200">対象</Label>
                                            <div className="relative flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
                                                <div
                                                    className="absolute h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-transform duration-300 ease-in-out"
                                                    style={{
                                                        width: "calc(50% - 4px)",
                                                        left: "4px",
                                                        transform: `translateX(${targetRole === "cast" ? "0" : "100%"})`
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setTargetRole("cast")}
                                                    className={`relative z-10 flex-1 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${targetRole === "cast" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
                                                >
                                                    キャスト
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setTargetRole("staff")}
                                                    className={`relative z-10 flex-1 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200 ${targetRole === "staff" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
                                                >
                                                    スタッフ
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {template && (
                                        <div className="flex items-center justify-between">
                                            <Label className="text-gray-700 dark:text-gray-200">公開状態</Label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    {isActive ? "公開中" : "非公開"}
                                                </span>
                                                <Switch
                                                    checked={isActive}
                                                    onCheckedChange={setIsActive}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Visible Fields Settings */}
                                <div className="border-t border-gray-200 dark:border-gray-700" />
                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                        表示項目
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        フォームに表示する項目を選択してください
                                    </p>

                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">基本情報</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                    checked={visibleFields.name}
                                                    onCheckedChange={() => toggleVisibleField("name")}
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">氏名</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                    checked={visibleFields.name_kana}
                                                    onCheckedChange={() => toggleVisibleField("name_kana")}
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">フリガナ</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                    checked={visibleFields.birth_date}
                                                    onCheckedChange={() => toggleVisibleField("birth_date")}
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">生年月日</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                    checked={visibleFields.phone_number}
                                                    onCheckedChange={() => toggleVisibleField("phone_number")}
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">電話番号</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                    checked={visibleFields.emergency_phone_number}
                                                    onCheckedChange={() => toggleVisibleField("emergency_phone_number")}
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">緊急連絡先</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                    checked={visibleFields.desired_cast_name}
                                                    onCheckedChange={() => toggleVisibleField("desired_cast_name")}
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {targetRole === "staff" ? "希望スタッフ名" : "希望源氏名"}
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">住所</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                    checked={visibleFields.zip_code}
                                                    onCheckedChange={() => toggleVisibleField("zip_code")}
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">郵便番号</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                    checked={visibleFields.prefecture}
                                                    onCheckedChange={() => toggleVisibleField("prefecture")}
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">都道府県</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                    checked={visibleFields.city}
                                                    onCheckedChange={() => toggleVisibleField("city")}
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">市区町村</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                    checked={visibleFields.street}
                                                    onCheckedChange={() => toggleVisibleField("street")}
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">番地</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                    checked={visibleFields.building}
                                                    onCheckedChange={() => toggleVisibleField("building")}
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">建物名</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">その他</p>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <Checkbox
                                                checked={visibleFields.past_employments}
                                                onCheckedChange={() => toggleVisibleField("past_employments")}
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">過去在籍店</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Custom Fields */}
                                <div className="border-t border-gray-200 dark:border-gray-700" />
                                {template ? (
                                    renderFieldsList()
                                ) : (
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                            カスタム質問
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            カスタム質問はフォーマット作成後に追加できます
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {!isAddingField && !editingField && activeTab === "edit" && (
                        <div className="flex flex-col gap-2 px-6 pb-6">
                            <Button
                                onClick={handleSaveTemplate}
                                disabled={isLoading || !name.trim()}
                                className="w-full rounded-lg"
                            >
                                {isLoading ? "保存中..." : "保存"}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="w-full rounded-lg"
                            >
                                キャンセル
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="max-w-sm rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                            フォーマットを削除
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        このフォーマットを削除すると、関連する回答データも全て削除されます。この操作は取り消せません。
                    </p>
                    <DialogFooter className="mt-4 gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteTemplate}
                            disabled={isDeleting}
                            className="rounded-lg"
                        >
                            {isDeleting ? "削除中..." : "削除する"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Field Confirmation Dialog */}
            <Dialog open={showDeleteFieldConfirm} onOpenChange={setShowDeleteFieldConfirm}>
                <DialogContent className="max-w-sm rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                            質問を削除
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        この質問を削除しますか？この操作は取り消せません。
                    </p>
                    <DialogFooter className="mt-4 gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteFieldConfirm(false)}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                if (editingField) {
                                    await handleDeleteField(editingField.id);
                                    setShowDeleteFieldConfirm(false);
                                    setEditingField(null);
                                    resetNewFieldForm();
                                }
                            }}
                            disabled={isLoading}
                            className="rounded-lg"
                        >
                            {isLoading ? "削除中..." : "削除する"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
