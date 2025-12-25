"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Plus, Trash2, Check, Pencil, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useGlobalLoading } from "@/components/global-loading";
import {
    getMenuOptions,
    getMenuOptionsForMenu,
    createMenuOption,
    updateMenuOption,
    deleteMenuOption,
    linkOptionToMenu,
    unlinkOptionFromMenu,
    MenuOption,
    MenuOptionChoiceInput,
} from "./actions";

interface MenuOptionLinkModalProps {
    menuId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    canEdit?: boolean;
}

type ViewMode = "list" | "create" | "edit";

export function MenuOptionLinkModal({ menuId, open, onOpenChange, canEdit = false }: MenuOptionLinkModalProps) {
    const { toast } = useToast();
    const { showLoading, hideLoading } = useGlobalLoading();
    const [allOptions, setAllOptions] = useState<MenuOption[]>([]);
    const [linkedOptionIds, setLinkedOptionIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("list");

    // 編集・作成用
    const [editingOption, setEditingOption] = useState<MenuOption | null>(null);
    const [optionName, setOptionName] = useState("");
    const [choices, setChoices] = useState<MenuOptionChoiceInput[]>([{ name: "", additional_price: 0 }]);
    const [deleteOptionId, setDeleteOptionId] = useState<string | null>(null);

    // 自動保存用ref
    const isInitialMount = useRef(true);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // データ取得
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [all, linked] = await Promise.all([
                getMenuOptions(),
                getMenuOptionsForMenu(menuId),
            ]);
            setAllOptions(all);
            setLinkedOptionIds(new Set(linked.map(o => o.id)));
        } catch (error) {
            console.error("Failed to fetch options:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchData();
            setViewMode("list");
            resetForm();
        }
    }, [open, menuId]);

    const resetForm = () => {
        setEditingOption(null);
        setOptionName("");
        setChoices([{ name: "", additional_price: 0 }]);
    };

    // オプションの紐付け/解除をトグル
    const toggleLink = async (optionId: string) => {
        try {
            if (linkedOptionIds.has(optionId)) {
                await unlinkOptionFromMenu(menuId, optionId);
                setLinkedOptionIds(prev => {
                    const next = new Set(prev);
                    next.delete(optionId);
                    return next;
                });
            } else {
                await linkOptionToMenu(menuId, optionId);
                setLinkedOptionIds(prev => new Set(prev).add(optionId));
            }
        } catch (error) {
            console.error("Failed to toggle link:", error);
            toast({
                title: "エラー",
                description: "オプションの設定に失敗しました",
                variant: "destructive",
            });
        }
    };

    // 新規作成開始
    const startCreate = () => {
        resetForm();
        setViewMode("create");
    };

    // 編集開始
    const startEdit = (option: MenuOption) => {
        setEditingOption(option);
        setOptionName(option.name);
        setChoices(
            option.choices?.map(c => ({
                id: c.id,
                name: c.name,
                additional_price: c.additional_price,
            })) || [{ name: "", additional_price: 0 }]
        );
        setViewMode("edit");
    };

    // 新規作成時の保存
    const handleCreate = async () => {
        if (!optionName.trim()) {
            toast({
                title: "入力エラー",
                description: "オプション名を入力してください",
                variant: "destructive",
            });
            return;
        }

        const validChoices = choices.filter(c => c.name.trim());
        if (validChoices.length === 0) {
            toast({
                title: "入力エラー",
                description: "少なくとも1つの選択肢を入力してください",
                variant: "destructive",
            });
            return;
        }

        showLoading("保存中...");
        try {
            const newOption = await createMenuOption({
                name: optionName.trim(),
                choices: validChoices,
            });
            // 作成したオプションをこのメニューに紐付け
            if (newOption) {
                await linkOptionToMenu(menuId, newOption.id);
            }
            fetchData();
            setViewMode("list");
            resetForm();
        } catch (error) {
            console.error("Failed to create option:", error);
            toast({
                title: "エラー",
                description: "オプションの作成に失敗しました",
                variant: "destructive",
            });
        } finally {
            hideLoading();
        }
    };

    // 編集時の自動保存（デバウンス付き）
    const autoSave = useCallback(async () => {
        if (!editingOption) return;
        if (!optionName.trim()) return;

        const validChoices = choices.filter(c => c.name.trim());
        if (validChoices.length === 0) return;

        showLoading("保存中...");
        try {
            await updateMenuOption(editingOption.id, {
                name: optionName.trim(),
                choices: validChoices,
            });
            // 一覧を再取得して更新
            fetchData();
        } catch (error) {
            console.error("Failed to save option:", error);
            toast({
                title: "エラー",
                description: "オプションの保存に失敗しました",
                variant: "destructive",
            });
        } finally {
            hideLoading();
        }
    }, [editingOption, optionName, choices, showLoading, hideLoading, toast, fetchData]);

    // 編集モードでの自動保存（デバウンス800ms）
    useEffect(() => {
        if (viewMode !== "edit" || !editingOption) {
            isInitialMount.current = true;
            return;
        }

        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            autoSave();
        }, 800);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [optionName, choices, viewMode, editingOption, autoSave]);

    // 削除
    const handleDelete = async () => {
        if (!deleteOptionId) return;

        try {
            await deleteMenuOption(deleteOptionId);
            toast({ title: "オプションを削除しました" });
            setDeleteOptionId(null);
            fetchData();
            if (viewMode === "edit") {
                setViewMode("list");
                resetForm();
            }
        } catch (error) {
            console.error("Failed to delete option:", error);
            toast({
                title: "エラー",
                description: "オプションの削除に失敗しました",
                variant: "destructive",
            });
        }
    };

    // 選択肢操作
    const addChoice = () => {
        setChoices([...choices, { name: "", additional_price: 0 }]);
    };

    const removeChoice = (index: number) => {
        if (choices.length > 1) {
            setChoices(choices.filter((_, i) => i !== index));
        }
    };

    const updateChoice = (index: number, field: "name" | "additional_price", value: string | number) => {
        const updated = [...choices];
        updated[index] = { ...updated[index], [field]: value };
        setChoices(updated);
    };

    // 戻るボタンの動作
    const handleBack = () => {
        if (viewMode === "list") {
            onOpenChange(false);
        } else {
            setViewMode("list");
            resetForm();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 w-[95%] rounded-2xl max-h-[90vh] overflow-hidden p-0 text-gray-900 dark:text-gray-100 flex flex-col">
                <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {viewMode === "create" ? "オプション作成" : viewMode === "edit" ? "オプション編集" : "オプション設定"}
                    </DialogTitle>
                    {viewMode === "edit" && editingOption && canEdit ? (
                        <button
                            type="button"
                            onClick={() => setDeleteOptionId(editingOption.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    ) : (
                        <div className="w-8 h-8" />
                    )}
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4">
                    {viewMode === "list" ? (
                        // オプション一覧
                        <div className="space-y-3">
                            {canEdit && (
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={startCreate}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    新しいオプションを作成
                                </Button>
                            )}

                            {isLoading ? (
                                <div className="text-center py-8 text-gray-500">読み込み中...</div>
                            ) : allOptions.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    オプションがありません
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        タップしてこのメニューに追加/削除
                                    </p>
                                    {allOptions.map((option) => {
                                        const isLinked = linkedOptionIds.has(option.id);
                                        return (
                                            <div
                                                key={option.id}
                                                className={`rounded-xl border transition-colors ${
                                                    isLinked
                                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                                                }`}
                                            >
                                                <div className="flex items-center p-3">
                                                    <button
                                                        type="button"
                                                        className="flex-1 text-left"
                                                        onClick={() => toggleLink(option.id)}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                                isLinked
                                                                    ? "border-blue-500 bg-blue-500"
                                                                    : "border-gray-300 dark:border-gray-600"
                                                            }`}>
                                                                {isLinked && <Check className="h-3 w-3 text-white" />}
                                                            </div>
                                                            <span className="font-medium">{option.name}</span>
                                                        </div>
                                                        {option.choices && option.choices.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1 ml-7">
                                                                {option.choices.map((choice) => (
                                                                    <span
                                                                        key={choice.id}
                                                                        className="text-xs text-gray-500 dark:text-gray-400"
                                                                    >
                                                                        {choice.name}
                                                                        {choice.additional_price > 0 && (
                                                                            <span className="text-blue-600 dark:text-blue-400 ml-0.5">
                                                                                +{choice.additional_price}
                                                                            </span>
                                                                        )}
                                                                        {option.choices && option.choices.indexOf(choice) < option.choices.length - 1 && " / "}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </button>
                                                    {canEdit && (
                                                        <button
                                                            type="button"
                                                            onClick={() => startEdit(option)}
                                                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ml-2"
                                                        >
                                                            <Pencil className="h-4 w-4 text-gray-500" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        // 作成/編集フォーム
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">オプション名</Label>
                                <Input
                                    placeholder="例: 濃さ、割り方、サイズ"
                                    value={optionName}
                                    onChange={(e) => setOptionName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium">選択肢</Label>
                                {choices.map((choice, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Input
                                            placeholder="選択肢名"
                                            value={choice.name}
                                            onChange={(e) => updateChoice(index, "name", e.target.value)}
                                            className="flex-1"
                                        />
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm text-gray-500">+</span>
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                value={choice.additional_price || ""}
                                                onChange={(e) => updateChoice(index, "additional_price", parseInt(e.target.value) || 0)}
                                                className="w-20"
                                            />
                                            <span className="text-sm text-gray-500">円</span>
                                        </div>
                                        {choices.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeChoice(index)}
                                                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <X className="h-4 w-4 text-red-500" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={addChoice}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    選択肢を追加
                                </Button>
                            </div>

                            {viewMode === "create" && (
                                <div className="flex flex-col gap-2 pt-4">
                                    <Button
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={handleCreate}
                                    >
                                        作成して追加
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => {
                                            setViewMode("list");
                                            resetForm();
                                        }}
                                    >
                                        キャンセル
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>

            <DeleteConfirmDialog
                open={!!deleteOptionId}
                onOpenChange={(open) => !open && setDeleteOptionId(null)}
                itemName="このオプション"
                description="他のメニューからも削除されます。"
                onConfirm={handleDelete}
            />
        </Dialog>
    );
}
