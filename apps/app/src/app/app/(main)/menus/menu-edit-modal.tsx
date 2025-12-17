"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MoreHorizontal, ChevronLeft, Trash2, Camera, Upload, Sparkles, X, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createMenu, updateMenu, deleteMenu, Menu, MenuCategory, createMenuCategory, uploadMenuImage, deleteMenuImage, generateMenuImage, researchItemMarketPrice, ItemMarketPriceResult, StoreLocationInfo } from "./actions";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";

interface MenuEditModalProps {
    menu: Menu | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: MenuCategory[];
    canEdit?: boolean;
    storeInfo?: StoreLocationInfo;
}

export function MenuEditModal({ menu, open, onOpenChange, categories, canEdit = false, storeInfo }: MenuEditModalProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [categoryMode, setCategoryMode] = useState<"select" | "create">("select");
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [newCategoryName, setNewCategoryName] = useState("");
    const [showActions, setShowActions] = useState(false);
    const [targetType, setTargetType] = useState<"guest" | "cast">("guest");
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [stockEnabled, setStockEnabled] = useState(false);
    const [stockQuantity, setStockQuantity] = useState(0);
    const [stockAlertThreshold, setStockAlertThreshold] = useState(3);
    const [isResearchingPrice, setIsResearchingPrice] = useState(false);
    const [marketPriceResult, setMarketPriceResult] = useState<ItemMarketPriceResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const priceInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (open) {
            setMarketPriceResult(null);
            if (menu) {
                setSelectedCategoryId(menu.category_id);
                setCategoryMode("select");
                setNewCategoryName("");
                setTargetType(menu.target_type || "guest");
                setImageUrl(menu.image_url || null);
                setStockEnabled(menu.stock_enabled || false);
                setStockQuantity(menu.stock_quantity || 0);
                setStockAlertThreshold(menu.stock_alert_threshold ?? 3);
            } else {
                setSelectedCategoryId("");
                setNewCategoryName("");
                setCategoryMode(categories.length > 0 ? "select" : "create");
                setTargetType("guest");
                setImageUrl(null);
                setStockEnabled(false);
                setStockQuantity(0);
                setStockAlertThreshold(3);
            }
        }
    }, [open, menu, categories]);

    const handleImageUpload = async (file: File) => {
        setIsUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const url = await uploadMenuImage(formData);
            setImageUrl(url);
        } catch (error) {
            console.error("Failed to upload image:", error);
            toast({
                title: "エラー",
                description: "画像のアップロードに失敗しました",
                variant: "destructive",
            });
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleImageUpload(file);
        }
        e.target.value = "";
    };

    const handleDeleteImage = async () => {
        if (!imageUrl) return;
        try {
            await deleteMenuImage(imageUrl);
            setImageUrl(null);
        } catch (error) {
            console.error("Failed to delete image:", error);
        }
    };

    const handleGenerateImage = async () => {
        const nameInput = document.getElementById("name") as HTMLInputElement;
        const menuName = nameInput?.value;
        if (!menuName?.trim()) {
            toast({
                title: "入力エラー",
                description: "メニュー名を入力してください",
                variant: "destructive",
            });
            return;
        }
        setIsGeneratingImage(true);
        try {
            const url = await generateMenuImage(menuName);
            setImageUrl(url);
        } catch (error) {
            console.error("Failed to generate image:", error);
            toast({
                title: "エラー",
                description: "画像の生成に失敗しました",
                variant: "destructive",
            });
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleResearchPrice = async () => {
        const nameInput = document.getElementById("name") as HTMLInputElement;
        const menuName = nameInput?.value;
        if (!menuName?.trim()) {
            toast({
                title: "入力エラー",
                description: "メニュー名を入力してください",
                variant: "destructive",
            });
            return;
        }

        if (!storeInfo?.prefecture || !storeInfo?.industry) {
            toast({
                title: "設定が必要です",
                description: "店舗設定で都道府県と業態を設定してください",
                variant: "destructive",
            });
            return;
        }

        setIsResearchingPrice(true);
        setMarketPriceResult(null);
        try {
            // カテゴリー名を取得
            let categoryName: string | undefined;
            if (categoryMode === "select" && selectedCategoryId) {
                const selectedCategory = categories.find(c => c.id === selectedCategoryId);
                categoryName = selectedCategory?.name;
            } else if (categoryMode === "create" && newCategoryName.trim()) {
                categoryName = newCategoryName.trim();
            }

            const result = await researchItemMarketPrice(
                menuName,
                storeInfo.prefecture,
                storeInfo.industry,
                categoryName
            );
            setMarketPriceResult(result);
        } catch (error) {
            console.error("Failed to research price:", error);
            toast({
                title: "エラー",
                description: "相場調査に失敗しました",
                variant: "destructive",
            });
        } finally {
            setIsResearchingPrice(false);
        }
    };

    const applyRecommendedPrice = () => {
        if (marketPriceResult && priceInputRef.current) {
            priceInputRef.current.value = String(marketPriceResult.recommendedPrice);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Check edit permission
        if (!canEdit) {
            toast({
                title: "権限エラー",
                description: "編集権限がありません",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);

        try {
            // カテゴリーの処理
            let categoryId = "";
            if (categoryMode === "create") {
                if (!newCategoryName.trim()) {
                    toast({
                        title: "入力エラー",
                        description: "カテゴリー名を入力してください",
                        variant: "destructive",
                    });
                    setIsSubmitting(false);
                    return;
                }
                // Create new category first
                const result = await createMenuCategory(newCategoryName);
                if (result.success && result.category) {
                    categoryId = result.category.id;
                } else {
                    throw new Error("Failed to create category");
                }
            } else {
                categoryId = selectedCategoryId;
            }

            if (!categoryId) {
                toast({
                    title: "入力エラー",
                    description: "カテゴリーを選択してください",
                    variant: "destructive",
                });
                setIsSubmitting(false);
                return;
            }
            formData.set("category_id", categoryId);
            formData.set("image_url", imageUrl || "");

            if (menu) {
                formData.append("id", menu.id);
                await updateMenu(formData);
            } else {
                await createMenu(formData);
            }
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            console.error("Failed to save menu:", error);
            toast({
                title: "エラー",
                description: "メニューの保存に失敗しました",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!menu) return;

        // Check edit permission
        if (!canEdit) {
            toast({
                title: "権限エラー",
                description: "削除権限がありません",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await deleteMenu(menu.id);
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            console.error("Failed to delete menu:", error);
            toast({
                title: "エラー",
                description: "削除に失敗しました",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800 w-[95%] rounded-lg max-h-[90vh] overflow-y-auto p-6 text-gray-900 dark:text-gray-100">
                <DialogHeader className="flex flex-row items-center justify-between gap-2 relative">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-0"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-xl font-bold text-gray-900 dark:text-white truncate">
                        {menu ? "メニュー編集" : "メニュー追加"}
                    </DialogTitle>
                    {menu ? (
                        <button
                            type="button"
                            onClick={() => setShowActions(!showActions)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                            aria-label="オプション"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                    ) : (
                        <div className="w-8 h-8" />
                    )}

                    {showActions && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                            <div className="absolute right-0 top-10 z-50 w-40 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-2 flex flex-col gap-1 text-sm animate-in fade-in zoom-in-95 duration-100">
                                <button
                                    type="button"
                                    className="w-full text-left px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                                    onClick={() => {
                                        setShowActions(false);
                                        handleDelete();
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    削除
                                </button>
                            </div>
                        </>
                    )}
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">メニュー名</Label>
                        <Input
                            id="name"
                            name="name"
                            defaultValue={menu?.name || ""}
                            placeholder="例: 生ビール"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>カテゴリー</Label>
                        <div className="inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-700 p-1 w-full">
                            <button
                                type="button"
                                onClick={() => setCategoryMode("select")}
                                disabled={categories.length === 0}
                                className={`flex-1 h-full flex items-center justify-center rounded-full text-sm font-medium transition-colors ${categoryMode === "select"
                                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                既存から選択
                            </button>
                            <button
                                type="button"
                                onClick={() => setCategoryMode("create")}
                                className={`flex-1 h-full flex items-center justify-center rounded-full text-sm font-medium transition-colors ${categoryMode === "create"
                                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                    }`}
                            >
                                新規作成
                            </button>
                        </div>

                        {categoryMode === "select" ? (
                            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="カテゴリーを選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="新しいカテゴリー名"
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="price">金額 (円)</Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                onClick={handleResearchPrice}
                                disabled={isResearchingPrice}
                            >
                                {isResearchingPrice ? (
                                    <>
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        調査中...
                                    </>
                                ) : (
                                    <>
                                        <TrendingUp className="h-3 w-3 mr-1" />
                                        相場を調べる
                                    </>
                                )}
                            </Button>
                        </div>
                        <Input
                            ref={priceInputRef}
                            id="price"
                            name="price"
                            type="number"
                            defaultValue={menu?.price !== undefined ? menu.price : ""}
                            placeholder="1000"
                            required
                            min="0"
                        />

                        {/* 相場調査結果 */}
                        {marketPriceResult && (
                            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                        {storeInfo?.prefecture} / {storeInfo?.industry}の相場
                                    </span>
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={applyRecommendedPrice}
                                    >
                                        推奨価格を適用
                                    </Button>
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                    <div>
                                        <div className="text-gray-500 dark:text-gray-400">最低</div>
                                        <div className="font-medium text-gray-700 dark:text-gray-300">
                                            {marketPriceResult.minPrice.toLocaleString()}円
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 dark:text-gray-400">平均</div>
                                        <div className="font-medium text-gray-700 dark:text-gray-300">
                                            {marketPriceResult.averagePrice.toLocaleString()}円
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 dark:text-gray-400">最高</div>
                                        <div className="font-medium text-gray-700 dark:text-gray-300">
                                            {marketPriceResult.maxPrice.toLocaleString()}円
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-blue-600 dark:text-blue-400">推奨</div>
                                        <div className="font-bold text-blue-700 dark:text-blue-300">
                                            {marketPriceResult.recommendedPrice.toLocaleString()}円
                                        </div>
                                    </div>
                                </div>
                                {marketPriceResult.notes && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 pt-1 border-t border-blue-100 dark:border-blue-800">
                                        {marketPriceResult.notes}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 画像セクション */}
                    <div className="space-y-2">
                        <Label>メニュー画像</Label>
                        {imageUrl ? (
                            <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                <div className="relative aspect-square w-full max-w-[200px] mx-auto">
                                    <Image
                                        src={imageUrl}
                                        alt="メニュー画像"
                                        fill
                                        sizes="200px"
                                        className="object-cover"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDeleteImage}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    <input
                                        type="file"
                                        ref={cameraInputRef}
                                        onChange={handleFileChange}
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => cameraInputRef.current?.click()}
                                        disabled={isUploadingImage || isGeneratingImage}
                                        className="flex-1 gap-1.5"
                                    >
                                        <Camera className="h-4 w-4" />
                                        撮影
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploadingImage || isGeneratingImage}
                                        className="flex-1 gap-1.5"
                                    >
                                        <Upload className="h-4 w-4" />
                                        選択
                                    </Button>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleGenerateImage}
                                    disabled={isUploadingImage || isGeneratingImage}
                                    className="w-full gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none hover:from-purple-600 hover:to-pink-600 hover:text-white"
                                >
                                    {isGeneratingImage ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            生成中...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4" />
                                            AIで画像を生成
                                        </>
                                    )}
                                </Button>
                                {isUploadingImage && (
                                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        アップロード中...
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label>注文対象</Label>
                            <input type="hidden" name="target_type" value={targetType} />
                            <div className="inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-700 p-1 w-full">
                                <button
                                    type="button"
                                    onClick={() => setTargetType("guest")}
                                    className={`flex-1 h-full flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
                                        targetType === "guest"
                                            ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                    }`}
                                >
                                    ゲスト
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTargetType("cast")}
                                    className={`flex-1 h-full flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
                                        targetType === "cast"
                                            ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                    }`}
                                >
                                    キャスト
                                </button>
                            </div>
                        </div>

                        {targetType === "cast" && (
                            <div className="space-y-2">
                                <Label htmlFor="cast_back_amount">キャストバック金額 (円)</Label>
                                <Input
                                    id="cast_back_amount"
                                    name="cast_back_amount"
                                    type="number"
                                    defaultValue={menu?.cast_back_amount || 0}
                                    placeholder="0"
                                    min="0"
                                />
                            </div>
                        )}

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="hide_from_slip"
                                name="hide_from_slip"
                                defaultChecked={menu ? menu.hide_from_slip : false}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="hide_from_slip" className="font-normal cursor-pointer">伝票で非表示にする</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="is_hidden"
                                name="is_hidden"
                                defaultChecked={menu ? menu.is_hidden : false}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="is_hidden" className="font-normal cursor-pointer">注文一覧から非表示にする</Label>
                        </div>

                        {/* 在庫管理 */}
                        <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="font-medium">在庫管理</Label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        在庫数を管理します
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="stock_enabled"
                                    name="stock_enabled"
                                    checked={stockEnabled}
                                    onChange={(e) => setStockEnabled(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                            </div>

                            {stockEnabled && (
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="stock_quantity">残り在庫数</Label>
                                        <Input
                                            id="stock_quantity"
                                            name="stock_quantity"
                                            type="number"
                                            value={stockQuantity}
                                            onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                                            placeholder="0"
                                            min="0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="stock_alert_threshold">低在庫アラート閾値</Label>
                                        <Input
                                            id="stock_alert_threshold"
                                            name="stock_alert_threshold"
                                            type="number"
                                            value={stockAlertThreshold}
                                            onChange={(e) => setStockAlertThreshold(parseInt(e.target.value) || 0)}
                                            placeholder="3"
                                            min="0"
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            この数以下になるとアラートが表示されます
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-col gap-3">
                        <Button type="submit" disabled={isSubmitting} className="h-11 w-full">
                            {isSubmitting ? "保存中..." : "保存"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 w-full">
                            キャンセル
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
