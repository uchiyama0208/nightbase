"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/confirm-dialog";
import { ChevronLeft, Trash2, Camera, Upload, Sparkles, X, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createMenu, updateMenu, deleteMenu, Menu, MenuCategory, createMenuCategory, uploadMenuImage, deleteMenuImage, generateMenuImage, researchItemMarketPrice, ItemMarketPriceResult, StoreLocationInfo } from "./actions";
import Image from "next/image";
import { toast } from "@/components/ui/use-toast";
import { useGlobalLoading } from "@/components/global-loading";
import { CommentSection } from "@/components/comment-section";
import { MenuOptionLinkSection } from "./menu-option-link-section";

interface MenuEditModalProps {
    menu: Menu | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: MenuCategory[];
    canEdit?: boolean;
    storeInfo?: StoreLocationInfo;
}

export function MenuEditModal({ menu, open, onOpenChange, categories, canEdit = false, storeInfo }: MenuEditModalProps) {
    const queryClient = useQueryClient();
    const { showLoading, hideLoading } = useGlobalLoading();

    // フォームの状態
    const [name, setName] = useState("");
    const [price, setPrice] = useState<number | "">("");
    const [categoryMode, setCategoryMode] = useState<"select" | "create">("select");
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [newCategoryName, setNewCategoryName] = useState("");
    const [targetType, setTargetType] = useState<"guest" | "cast">("guest");
    const [castBackAmount, setCastBackAmount] = useState<number>(0);
    const [hideFromSlip, setHideFromSlip] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [stockEnabled, setStockEnabled] = useState(false);
    const [stockQuantity, setStockQuantity] = useState(0);
    const [stockAlertThreshold, setStockAlertThreshold] = useState(3);

    // UI状態
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [isResearchingPrice, setIsResearchingPrice] = useState(false);
    const [marketPriceResult, setMarketPriceResult] = useState<ItemMarketPriceResult | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [currentMenuId, setCurrentMenuId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitializedRef = useRef(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saveToastRef = useRef<any>(null);

    // 初期化
    useEffect(() => {
        if (open) {
            isInitializedRef.current = false;
            setMarketPriceResult(null);

            if (menu) {
                setCurrentMenuId(menu.id);
                setName(menu.name);
                setPrice(menu.price);
                setSelectedCategoryId(menu.category_id);
                setCategoryMode("select");
                setNewCategoryName("");
                setTargetType(menu.target_type || "guest");
                setCastBackAmount(menu.cast_back_amount || 0);
                setHideFromSlip(menu.hide_from_slip || false);
                setIsHidden(menu.is_hidden || false);
                setImageUrl(menu.image_url || null);
                setStockEnabled(menu.stock_enabled || false);
                setStockQuantity(menu.stock_quantity || 0);
                setStockAlertThreshold(menu.stock_alert_threshold ?? 3);
            } else {
                setCurrentMenuId(null);
                setName("");
                setPrice("");
                setSelectedCategoryId("");
                setNewCategoryName("");
                setCategoryMode(categories.length > 0 ? "select" : "create");
                setTargetType("guest");
                setCastBackAmount(0);
                setHideFromSlip(false);
                setIsHidden(false);
                setImageUrl(null);
                setStockEnabled(false);
                setStockQuantity(0);
                setStockAlertThreshold(3);
            }

            // 初期化完了を遅延させて初回の自動保存を防ぐ
            setTimeout(() => {
                isInitializedRef.current = true;
            }, 100);
        }

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [open, menu, categories]);

    // 自動保存（既存メニューのみ）
    const autoSave = useCallback(async () => {
        if (!currentMenuId || !canEdit || !isInitializedRef.current) return;
        if (!name.trim() || price === "" || (!selectedCategoryId && !newCategoryName.trim())) return;

        setIsSaving(true);
        showLoading("保存中...");

        try {
            let categoryId = selectedCategoryId;

            // 新規カテゴリーの場合は作成
            if (categoryMode === "create" && newCategoryName.trim()) {
                const result = await createMenuCategory(newCategoryName.trim());
                if (result.success && result.category) {
                    categoryId = result.category.id;
                    setSelectedCategoryId(categoryId);
                    setCategoryMode("select");
                    setNewCategoryName("");
                }
            }

            if (!categoryId) {
                setIsSaving(false);
                hideLoading();
                return;
            }

            const formData = new FormData();
            formData.set("id", currentMenuId);
            formData.set("name", name);
            formData.set("price", String(price));
            formData.set("category_id", categoryId);
            formData.set("target_type", targetType);
            formData.set("cast_back_amount", String(castBackAmount));
            formData.set("hide_from_slip", hideFromSlip ? "on" : "");
            formData.set("is_hidden", isHidden ? "on" : "");
            formData.set("image_url", imageUrl || "");
            formData.set("stock_enabled", stockEnabled ? "on" : "");
            formData.set("stock_quantity", String(stockQuantity));
            formData.set("stock_alert_threshold", String(stockAlertThreshold));

            await updateMenu(formData);
            await queryClient.invalidateQueries({ queryKey: ["menus"] });
        } catch (error) {
            console.error("Failed to auto-save:", error);
            toast({
                title: "エラー",
                description: "保存に失敗しました",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
            hideLoading();
        }
    }, [currentMenuId, canEdit, name, price, selectedCategoryId, newCategoryName, categoryMode, targetType, castBackAmount, hideFromSlip, isHidden, imageUrl, stockEnabled, stockQuantity, stockAlertThreshold, queryClient, showLoading, hideLoading]);

    // デバウンスされた自動保存
    useEffect(() => {
        if (!currentMenuId || !isInitializedRef.current) return;

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
    }, [name, price, selectedCategoryId, targetType, castBackAmount, hideFromSlip, isHidden, stockEnabled, stockQuantity, stockAlertThreshold, autoSave, currentMenuId]);

    // 画像変更時は即座に保存
    useEffect(() => {
        if (currentMenuId && isInitializedRef.current && imageUrl !== menu?.image_url) {
            autoSave();
        }
    }, [imageUrl]);

    // 新規メニュー作成
    const handleCreate = async () => {
        if (!canEdit) return;
        if (!name.trim()) {
            toast({ title: "メニュー名を入力してください", variant: "destructive" });
            return;
        }
        if (price === "") {
            toast({ title: "金額を入力してください", variant: "destructive" });
            return;
        }

        let categoryId = selectedCategoryId;
        if (categoryMode === "create") {
            if (!newCategoryName.trim()) {
                toast({ title: "カテゴリー名を入力してください", variant: "destructive" });
                return;
            }
            const result = await createMenuCategory(newCategoryName.trim());
            if (result.success && result.category) {
                categoryId = result.category.id;
            } else {
                toast({ title: "カテゴリーの作成に失敗しました", variant: "destructive" });
                return;
            }
        }

        if (!categoryId) {
            toast({ title: "カテゴリーを選択してください", variant: "destructive" });
            return;
        }

        setIsCreating(true);
        try {
            const formData = new FormData();
            formData.set("name", name);
            formData.set("price", String(price));
            formData.set("category_id", categoryId);
            formData.set("target_type", targetType);
            formData.set("cast_back_amount", String(castBackAmount));
            formData.set("hide_from_slip", hideFromSlip ? "on" : "");
            formData.set("is_hidden", isHidden ? "on" : "");
            formData.set("image_url", imageUrl || "");
            formData.set("stock_enabled", stockEnabled ? "on" : "");
            formData.set("stock_quantity", String(stockQuantity));
            formData.set("stock_alert_threshold", String(stockAlertThreshold));

            const newMenu = await createMenu(formData);
            await queryClient.invalidateQueries({ queryKey: ["menus"] });

            if (newMenu.menu?.id) {
                setCurrentMenuId(newMenu.menu.id);
                setSelectedCategoryId(categoryId);
                setCategoryMode("select");
                setNewCategoryName("");
                toast({ title: "メニューを作成しました" });
            } else {
                onOpenChange(false);
            }
        } catch (error) {
            console.error("Failed to create menu:", error);
            toast({ title: "作成に失敗しました", variant: "destructive" });
        } finally {
            setIsCreating(false);
        }
    };

    const handleImageUpload = async (file: File) => {
        setIsUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const url = await uploadMenuImage(formData);
            setImageUrl(url);
        } catch (error) {
            console.error("Failed to upload image:", error);
            toast({ title: "画像のアップロードに失敗しました", variant: "destructive" });
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleImageUpload(file);
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
        if (!name.trim()) {
            toast({ title: "メニュー名を入力してください", variant: "destructive" });
            return;
        }
        setIsGeneratingImage(true);
        try {
            const url = await generateMenuImage(name);
            setImageUrl(url);
        } catch (error) {
            console.error("Failed to generate image:", error);
            toast({ title: "画像の生成に失敗しました", variant: "destructive" });
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleResearchPrice = async () => {
        if (!name.trim()) {
            toast({ title: "メニュー名を入力してください", variant: "destructive" });
            return;
        }
        if (!storeInfo?.prefecture || !storeInfo?.industry) {
            toast({ title: "店舗設定で都道府県と業態を設定してください", variant: "destructive" });
            return;
        }
        setIsResearchingPrice(true);
        setMarketPriceResult(null);
        try {
            let categoryName: string | undefined;
            if (categoryMode === "select" && selectedCategoryId) {
                categoryName = categories.find(c => c.id === selectedCategoryId)?.name;
            } else if (categoryMode === "create" && newCategoryName.trim()) {
                categoryName = newCategoryName.trim();
            }
            const result = await researchItemMarketPrice(name, storeInfo.prefecture, storeInfo.industry, categoryName);
            setMarketPriceResult(result);
        } catch (error) {
            console.error("Failed to research price:", error);
            toast({ title: "相場調査に失敗しました", variant: "destructive" });
        } finally {
            setIsResearchingPrice(false);
        }
    };

    const handleDelete = async () => {
        if (!currentMenuId || !canEdit) return;

        try {
            await deleteMenu(currentMenuId);
            await queryClient.invalidateQueries({ queryKey: ["menus"] });
            setShowDeleteConfirm(false);
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to delete menu:", error);
            toast({ title: "削除に失敗しました", variant: "destructive" });
        }
    };

    const isEditMode = !!currentMenuId;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 w-[95%] rounded-2xl max-h-[90vh] overflow-hidden p-0 text-gray-900 dark:text-gray-100 flex flex-col">
                <DialogHeader className="flex-shrink-0 bg-white dark:bg-gray-900 flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4 relative">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                        aria-label="戻る"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {isEditMode ? "メニュー編集" : "メニュー追加"}
                    </DialogTitle>

                    {/* 削除ボタン */}
                    {isEditMode && canEdit ? (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                            aria-label="削除"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    ) : (
                        <div className="w-8 h-8" />
                    )}
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                    <div className="space-y-4 px-6 py-4">
                        {/* メニュー名 */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">メニュー名</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="例: 生ビール"
                            />
                        </div>

                        {/* カテゴリー */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">カテゴリー</Label>
                            <div className="inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-700 p-1 w-full">
                                <button
                                    type="button"
                                    onClick={() => setCategoryMode("select")}
                                    disabled={categories.length === 0}
                                    className={`flex-1 h-full flex items-center justify-center rounded-full text-sm font-medium transition-colors ${categoryMode === "select" ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"} disabled:opacity-50`}
                                >
                                    既存から選択
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCategoryMode("create")}
                                    className={`flex-1 h-full flex items-center justify-center rounded-full text-sm font-medium transition-colors ${categoryMode === "create" ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}
                                >
                                    新規作成
                                </button>
                            </div>
                            {categoryMode === "select" ? (
                                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                    <SelectTrigger><SelectValue placeholder="カテゴリーを選択" /></SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
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

                        {/* 金額 */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">金額 (円)</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50"
                                    onClick={handleResearchPrice}
                                    disabled={isResearchingPrice}
                                >
                                    {isResearchingPrice ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />調査中...</> : <><TrendingUp className="h-3 w-3 mr-1" />相場を調べる</>}
                                </Button>
                            </div>
                            <Input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value ? parseInt(e.target.value) : "")}
                                placeholder="1000"
                                min="0"
                            />
                            {marketPriceResult && (
                                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{storeInfo?.prefecture} / {storeInfo?.industry}の相場</span>
                                        <Button type="button" size="sm" className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setPrice(marketPriceResult.recommendedPrice)}>推奨価格を適用</Button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                        <div><div className="text-gray-500">最低</div><div className="font-medium">{marketPriceResult.minPrice.toLocaleString()}円</div></div>
                                        <div><div className="text-gray-500">平均</div><div className="font-medium">{marketPriceResult.averagePrice.toLocaleString()}円</div></div>
                                        <div><div className="text-gray-500">最高</div><div className="font-medium">{marketPriceResult.maxPrice.toLocaleString()}円</div></div>
                                        <div><div className="text-blue-600">推奨</div><div className="font-bold text-blue-700">{marketPriceResult.recommendedPrice.toLocaleString()}円</div></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 画像 */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">メニュー画像</Label>
                            {imageUrl ? (
                                <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                    <div className="relative aspect-square w-full max-w-[200px] mx-auto">
                                        <Image src={imageUrl} alt="メニュー画像" fill sizes="200px" className="object-cover" />
                                    </div>
                                    <button type="button" onClick={handleDeleteImage} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                        <input type="file" ref={cameraInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
                                        <Button type="button" variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()} disabled={isUploadingImage || isGeneratingImage} className="flex-1 gap-1.5">
                                            <Camera className="h-4 w-4" />撮影
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage || isGeneratingImage} className="flex-1 gap-1.5">
                                            <Upload className="h-5 w-5" />選択
                                        </Button>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={handleGenerateImage} disabled={isUploadingImage || isGeneratingImage} className="w-full gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none hover:from-purple-600 hover:to-pink-600 hover:text-white">
                                        {isGeneratingImage ? <><Loader2 className="h-4 w-4 animate-spin" />生成中...</> : <><Sparkles className="h-4 w-4" />AIで画像を生成</>}
                                    </Button>
                                    {isUploadingImage && <div className="flex items-center justify-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />アップロード中...</div>}
                                </div>
                            )}
                        </div>

                        {/* 注文対象 */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">注文対象</Label>
                            <div className="inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-700 p-1 w-full">
                                <button type="button" onClick={() => setTargetType("guest")} className={`flex-1 h-full flex items-center justify-center rounded-full text-sm font-medium transition-colors ${targetType === "guest" ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>ゲスト</button>
                                <button type="button" onClick={() => setTargetType("cast")} className={`flex-1 h-full flex items-center justify-center rounded-full text-sm font-medium transition-colors ${targetType === "cast" ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>キャスト</button>
                            </div>
                        </div>

                        {targetType === "cast" && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">キャストバック金額 (円)</Label>
                                <Input type="number" value={castBackAmount} onChange={(e) => setCastBackAmount(parseInt(e.target.value) || 0)} placeholder="0" min="0" />
                            </div>
                        )}

                        {/* チェックボックス */}
                        <div className="flex items-center space-x-2">
                            <input type="checkbox" id="hide_from_slip" checked={hideFromSlip} onChange={(e) => setHideFromSlip(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                            <Label htmlFor="hide_from_slip" className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer">伝票で非表示にする</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input type="checkbox" id="is_hidden" checked={isHidden} onChange={(e) => setIsHidden(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                            <Label htmlFor="is_hidden" className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer">注文一覧から非表示にする</Label>
                        </div>

                        {/* 在庫管理 */}
                        <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">在庫管理</Label>
                                    <p className="text-xs text-gray-500">在庫数を管理します</p>
                                </div>
                                <input type="checkbox" checked={stockEnabled} onChange={(e) => setStockEnabled(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                            </div>
                            {stockEnabled && (
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">残り在庫数</Label>
                                        <Input type="number" value={stockQuantity} onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)} placeholder="0" min="0" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">低在庫アラート閾値</Label>
                                        <Input type="number" value={stockAlertThreshold} onChange={(e) => setStockAlertThreshold(parseInt(e.target.value) || 0)} placeholder="3" min="0" />
                                        <p className="text-xs text-gray-500">この数以下になるとアラートが表示されます</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* オプション紐付け */}
                        <MenuOptionLinkSection menuId={currentMenuId} canEdit={canEdit} />

                        {/* 新規作成ボタン */}
                        {!isEditMode && canEdit && (
                            <div className="pt-4">
                                <Button
                                    type="button"
                                    onClick={handleCreate}
                                    disabled={isCreating}
                                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {isCreating ? "作成中..." : "作成"}
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* コメントセクション */}
                    {isEditMode && (
                        <div className="px-6 pb-6">
                            <CommentSection targetType="menu" targetId={currentMenuId!} isOpen={open} />
                        </div>
                    )}
                </div>
            </DialogContent>

            <DeleteConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                itemName="このメニュー"
                onConfirm={handleDelete}
            />
        </Dialog>
    );
}
