"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Upload, Sparkles, Loader2, X, Trash2, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
    extractMenusFromImage,
    bulkCreateMenus,
    createMenuCategory,
    type ExtractedMenuItem,
    type MenuCategory,
} from "./actions";

interface MenuAIModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: MenuCategory[];
    onSuccess: () => void;
}

type Step = "upload" | "preview" | "confirm";

interface EditableMenuItem extends ExtractedMenuItem {
    id: string;
    categoryId: string;
    selected: boolean;
}

export function MenuAIModal({ isOpen, onClose, categories, onSuccess }: MenuAIModalProps) {
    const [step, setStep] = useState<Step>("upload");
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [extractedItems, setExtractedItems] = useState<EditableMenuItem[]>([]);
    const [localCategories, setLocalCategories] = useState<MenuCategory[]>(categories);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(""); // 最初に選択するカテゴリ

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const resetState = useCallback(() => {
        setStep("upload");
        setIsProcessing(false);
        setError(null);
        setImagePreview(null);
        setExtractedItems([]);
        setNewCategoryName("");
        setIsAddingCategory(false);
        setSelectedCategoryId("");
    }, []);

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileSelect = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            setError("画像ファイルを選択してください");
            return;
        }

        // 画像をbase64に変換
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target?.result as string;
            setImagePreview(base64);
            setStep("preview");
        };
        reader.readAsDataURL(file);
    };

    const handleExtract = async () => {
        if (!imagePreview) return;

        setIsProcessing(true);
        setError(null);

        try {
            const items = await extractMenusFromImage(imagePreview);

            // 抽出されたアイテムを編集可能な形式に変換
            // 選択されたカテゴリがあればそれを全アイテムに適用（"none"の場合は空）
            const categoryIdToApply = selectedCategoryId === "none" ? "" : selectedCategoryId;
            const editableItems: EditableMenuItem[] = items.map((item, index) => ({
                ...item,
                id: `extracted-${index}`,
                categoryId: categoryIdToApply,
                selected: true,
            }));

            setExtractedItems(editableItems);
            setStep("confirm");
        } catch (err) {
            console.error("Error extracting menus:", err);
            setError("メニューの読み取りに失敗しました");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleItemChange = (id: string, field: keyof EditableMenuItem, value: any) => {
        setExtractedItems(prev =>
            prev.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    const handleRemoveItem = (id: string) => {
        setExtractedItems(prev => prev.filter(item => item.id !== id));
    };

    const handleToggleSelect = (id: string) => {
        setExtractedItems(prev =>
            prev.map(item =>
                item.id === id ? { ...item, selected: !item.selected } : item
            )
        );
    };

    const handleSelectAll = () => {
        const allSelected = extractedItems.every(item => item.selected);
        setExtractedItems(prev =>
            prev.map(item => ({ ...item, selected: !allSelected }))
        );
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;

        setIsAddingCategory(true);
        try {
            const result = await createMenuCategory(newCategoryName.trim());
            if (result.category) {
                const newCategory = result.category;
                setLocalCategories(prev => [...prev, newCategory]);
            }
            setNewCategoryName("");
        } catch (err) {
            console.error("Error creating category:", err);
            setError("カテゴリの作成に失敗しました");
        } finally {
            setIsAddingCategory(false);
        }
    };

    const handleSubmit = async () => {
        const selectedItems = extractedItems.filter(item => item.selected && item.categoryId);

        if (selectedItems.length === 0) {
            setError("追加するメニューを選択してください（カテゴリも必須です）");
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            await bulkCreateMenus(
                selectedItems.map(item => ({
                    name: item.name,
                    price: item.price,
                    categoryId: item.categoryId,
                }))
            );

            onSuccess();
            handleClose();
        } catch (err) {
            console.error("Error creating menus:", err);
            setError("メニューの追加に失敗しました");
        } finally {
            setIsProcessing(false);
        }
    };

    const selectedCount = extractedItems.filter(item => item.selected && item.categoryId).length;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border border-gray-200 bg-white p-0 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-50">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        写真からメニューを読み取り
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 pt-4">
                    {error && (
                        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Step 1: Upload */}
                    {step === "upload" && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                メニュー表の写真を撮影またはアップロードしてください。AIが自動でメニュー名と価格を読み取ります。
                            </p>

                            {/* カテゴリ選択 */}
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    カテゴリ
                                </Label>
                                <Select value={selectedCategoryId || "none"} onValueChange={setSelectedCategoryId}>
                                    <SelectTrigger className="w-full h-10 rounded-lg">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">後で個別に設定する</SelectItem>
                                        {localCategories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1 h-32 rounded-xl border-dashed border-2 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                    onClick={() => cameraInputRef.current?.click()}
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <Camera className="h-8 w-8 text-gray-400" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">カメラで撮影</span>
                                    </div>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 h-32 rounded-xl border-dashed border-2 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload className="h-8 w-8 text-gray-400" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">画像をアップロード</span>
                                    </div>
                                </Button>
                            </div>
                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                            />
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                            />
                        </div>
                    )}

                    {/* Step 2: Preview */}
                    {step === "preview" && imagePreview && (
                        <div className="space-y-4">
                            <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                                <img
                                    src={imagePreview}
                                    alt="アップロードした画像"
                                    className="w-full h-auto max-h-64 object-contain bg-gray-100 dark:bg-gray-800"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setImagePreview(null);
                                        setStep("upload");
                                    }}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                                この画像からメニューを読み取りますか？
                            </p>
                        </div>
                    )}

                    {/* Step 3: Confirm */}
                    {step === "confirm" && (
                        <div className="space-y-4">
                            {/* Category quick add */}
                            <div className="flex items-center gap-2">
                                <Input
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="新しいカテゴリを追加"
                                    className="flex-1 h-9 rounded-lg"
                                    onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                                />
                                <Button
                                    size="sm"
                                    onClick={handleAddCategory}
                                    disabled={!newCategoryName.trim() || isAddingCategory}
                                    className="rounded-lg"
                                >
                                    {isAddingCategory ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>

                            {/* Select all */}
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={handleSelectAll}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    {extractedItems.every(item => item.selected) ? "すべて選択解除" : "すべて選択"}
                                </button>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {selectedCount}件選択中
                                </span>
                            </div>

                            {/* Items list */}
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {extractedItems.length === 0 ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                                        メニューが見つかりませんでした
                                    </p>
                                ) : (
                                    extractedItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                                                item.selected
                                                    ? "border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20"
                                                    : "border-gray-200 dark:border-gray-700"
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleToggleSelect(item.id)}
                                                className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                                    item.selected
                                                        ? "bg-purple-500 border-purple-500 text-white"
                                                        : "border-gray-300 dark:border-gray-600"
                                                }`}
                                            >
                                                {item.selected && <Check className="h-3 w-3" />}
                                            </button>
                                            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <Input
                                                    value={item.name}
                                                    onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                                                    className="h-8 text-sm rounded"
                                                    placeholder="メニュー名"
                                                />
                                                <Input
                                                    type="number"
                                                    value={item.price}
                                                    onChange={(e) => handleItemChange(item.id, "price", parseInt(e.target.value) || 0)}
                                                    className="h-8 text-sm rounded"
                                                    placeholder="価格"
                                                />
                                                <Select
                                                    value={item.categoryId}
                                                    onValueChange={(value) => handleItemChange(item.id, "categoryId", value)}
                                                >
                                                    <SelectTrigger className="h-8 text-sm rounded">
                                                        <SelectValue placeholder="カテゴリ" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {localCategories.map((cat) => (
                                                            <SelectItem key={cat.id} value={cat.id}>
                                                                {cat.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="shrink-0 p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-0 gap-2">
                    {step === "upload" && (
                        <Button variant="outline" onClick={handleClose} className="rounded-lg">
                            キャンセル
                        </Button>
                    )}

                    {step === "preview" && (
                        <>
                            <Button variant="outline" onClick={() => setStep("upload")} className="rounded-lg">
                                戻る
                            </Button>
                            <Button
                                onClick={handleExtract}
                                disabled={isProcessing}
                                className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none hover:from-purple-600 hover:to-pink-600"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        読み取り中...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        AIで読み取る
                                    </>
                                )}
                            </Button>
                        </>
                    )}

                    {step === "confirm" && (
                        <>
                            <Button variant="outline" onClick={() => setStep("preview")} className="rounded-lg">
                                戻る
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isProcessing || selectedCount === 0}
                                className="rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        追加中...
                                    </>
                                ) : (
                                    `${selectedCount}件を追加`
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
