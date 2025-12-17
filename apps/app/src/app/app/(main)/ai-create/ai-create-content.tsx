"use client";

import { useState, useTransition } from "react";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Sparkles,
    Wand2,
    Image as ImageIcon,
    Download,
    Trash2,
    Zap,
    Clock,
    Grid3X3,
    LayoutTemplate,
    History,
    ChevronRight,
    Loader2,
    PartyPopper,
    UtensilsCrossed,
    Users,
    CalendarDays,
    Share2,
    Palette,
} from "lucide-react";
import {
    type GeneratedImage,
    type StoreCredits,
    generateImage,
    deleteGeneratedImage,
} from "./actions";
import { type Template } from "./templates";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

interface AICreateContentProps {
    initialCredits: StoreCredits | null;
    initialImages: GeneratedImage[];
    templates: Template[];
    sizePresets: { name: string; width: number; height: number; ratio: string }[];
    canEdit?: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
    event: <PartyPopper className="h-4 w-4" />,
    menu: <UtensilsCrossed className="h-4 w-4" />,
    cast: <Users className="h-4 w-4" />,
    seasonal: <CalendarDays className="h-4 w-4" />,
    sns: <Share2 className="h-4 w-4" />,
    custom: <Palette className="h-4 w-4" />,
};

const categoryNames: Record<string, string> = {
    event: "イベント",
    menu: "メニュー",
    cast: "キャスト",
    seasonal: "季節",
    sns: "SNS",
    custom: "カスタム",
};

export function AICreateContent({
    initialCredits,
    initialImages,
    templates,
    sizePresets,
}: AICreateContentProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [credits, setCredits] = useState(initialCredits);
    const [images, setImages] = useState(initialImages);

    // タブ状態
    const [activeTab, setActiveTab] = useState<"create" | "history">("create");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

    // 生成フォーム状態
    const [customPrompt, setCustomPrompt] = useState("");
    const [selectedSize, setSelectedSize] = useState(sizePresets[0]);
    const [customWidth, setCustomWidth] = useState(1080);
    const [customHeight, setCustomHeight] = useState(1080);
    const [isGenerating, setIsGenerating] = useState(false);

    // 詳細モーダル
    const [detailImage, setDetailImage] = useState<GeneratedImage | null>(null);

    // 削除確認
    const [deleteTarget, setDeleteTarget] = useState<GeneratedImage | null>(null);

    const categories = [...new Set(templates.map(t => t.category))];

    const filteredTemplates = selectedCategory
        ? templates.filter(t => t.category === selectedCategory)
        : templates;

    const handleGenerate = async () => {
        if (!credits || credits.ai_credits < 1) {
            toast({ title: "クレジットが不足しています" });
            return;
        }

        const prompt = selectedTemplate
            ? selectedTemplate.promptTemplate.replace("{custom_text}", customPrompt || "elegant design")
            : customPrompt;

        if (!prompt) {
            toast({ title: "プロンプトを入力してください" });
            return;
        }

        const width = selectedSize.ratio === "custom" ? customWidth : selectedSize.width;
        const height = selectedSize.ratio === "custom" ? customHeight : selectedSize.height;

        setIsGenerating(true);

        startTransition(async () => {
            const result = await generateImage(
                prompt,
                selectedTemplate?.type || "custom",
                width,
                height,
                selectedTemplate?.id,
                selectedTemplate?.name
            );

            setIsGenerating(false);

            if (result.success && result.image) {
                setImages(prev => [result.image!, ...prev]);
                setCredits(prev => prev ? { ...prev, ai_credits: prev.ai_credits - 1 } : null);
                toast({ title: "画像を生成しました" });
                setActiveTab("history");
            } else {
                toast({ title: result.error || "生成に失敗しました" });
            }
        });
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        startTransition(async () => {
            const result = await deleteGeneratedImage(deleteTarget.id);
            if (result.success) {
                setImages(prev => prev.filter(img => img.id !== deleteTarget.id));
                toast({ title: "削除しました" });
            } else {
                toast({ title: result.error || "削除に失敗しました" });
            }
            setDeleteTarget(null);
        });
    };

    const handleDownload = async (image: GeneratedImage) => {
        try {
            const response = await fetch(image.image_url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ai-create-${image.id}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch {
            toast({ title: "ダウンロードに失敗しました" });
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900">
            {/* ヘッダー */}
            <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30">
                            <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white">AIクリエイト</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">AI画像生成</p>
                        </div>
                    </div>

                    {/* クレジット表示 */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {credits?.ai_credits ?? 0}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">クレジット</span>
                    </div>
                </div>
            </div>

            {/* タブ切り替え */}
            <div className="px-4 py-3">
                <div className="flex gap-2 p-1 rounded-full bg-gray-100 dark:bg-gray-800">
                    <button
                        onClick={() => setActiveTab("create")}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            activeTab === "create"
                                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        <Wand2 className="h-4 w-4" />
                        生成
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            activeTab === "history"
                                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        <History className="h-4 w-4" />
                        履歴
                        {images.length > 0 && (
                            <span className="px-1.5 py-0.5 text-xs rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400">
                                {images.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* メインコンテンツ */}
            <div className="px-4 pb-24">
                {activeTab === "create" ? (
                    <div className="space-y-6">
                        {/* テンプレートカテゴリー選択 */}
                        <div>
                            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                <LayoutTemplate className="h-4 w-4" />
                                テンプレート
                            </h2>
                            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                                <button
                                    onClick={() => {
                                        setSelectedCategory(null);
                                        setSelectedTemplate(null);
                                    }}
                                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                        selectedCategory === null
                                            ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700"
                                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                    }`}
                                >
                                    すべて
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => {
                                            setSelectedCategory(cat);
                                            setSelectedTemplate(null);
                                        }}
                                        className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                            selectedCategory === cat
                                                ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700"
                                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                        }`}
                                    >
                                        {categoryIcons[cat]}
                                        {categoryNames[cat]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* テンプレート一覧 */}
                        <div className="grid grid-cols-2 gap-3">
                            {filteredTemplates.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(template)}
                                    className={`relative p-4 rounded-2xl text-left transition-all ${
                                        selectedTemplate?.id === template.id
                                            ? "bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-400 dark:border-violet-600"
                                            : "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                            {categoryIcons[template.category]}
                                        </div>
                                        {selectedTemplate?.id === template.id && (
                                            <div className="w-2 h-2 rounded-full bg-violet-500" />
                                        )}
                                    </div>
                                    <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                                        {template.name}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                        {template.description}
                                    </p>
                                </button>
                            ))}

                            {/* カスタム生成カード */}
                            <button
                                onClick={() => setSelectedTemplate(null)}
                                className={`relative p-4 rounded-2xl text-left transition-all ${
                                    selectedTemplate === null
                                        ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-600"
                                        : "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                        <Palette className="h-4 w-4" />
                                    </div>
                                    {selectedTemplate === null && (
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    )}
                                </div>
                                <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                                    カスタム生成
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                    自由にプロンプトを入力して生成
                                </p>
                            </button>
                        </div>

                        {/* プロンプト入力 */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                {selectedTemplate ? "追加の説明（任意）" : "プロンプト"}
                            </label>
                            <Textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder={
                                    selectedTemplate
                                        ? "例: クリスマス限定メニュー、12/24開催"
                                        : "生成したい画像の説明を入力..."
                                }
                                className="min-h-[100px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:ring-violet-500"
                            />
                        </div>

                        {/* サイズ選択 */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block flex items-center gap-2">
                                <Grid3X3 className="h-4 w-4" />
                                サイズ
                            </label>
                            <Select
                                value={selectedSize.name}
                                onValueChange={(value) => {
                                    const preset = sizePresets.find(p => p.name === value);
                                    if (preset) setSelectedSize(preset);
                                }}
                            >
                                <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {sizePresets.map(preset => (
                                        <SelectItem key={preset.name} value={preset.name}>
                                            {preset.name} ({preset.width}×{preset.height})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* カスタムサイズ入力 */}
                            {selectedSize.ratio === "custom" && (
                                <div className="flex gap-3 mt-3">
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">幅</label>
                                        <Input
                                            type="number"
                                            value={customWidth}
                                            onChange={(e) => setCustomWidth(parseInt(e.target.value) || 1080)}
                                            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">高さ</label>
                                        <Input
                                            type="number"
                                            value={customHeight}
                                            onChange={(e) => setCustomHeight(parseInt(e.target.value) || 1080)}
                                            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 生成ボタン */}
                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating || !credits || credits.ai_credits < 1}
                            className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                    生成中...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-5 w-5 mr-2" />
                                    生成する（1クレジット）
                                </>
                            )}
                        </Button>
                    </div>
                ) : (
                    /* 履歴タブ */
                    <div>
                        {images.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                                    <ImageIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400">まだ生成した画像がありません</p>
                                <Button
                                    onClick={() => setActiveTab("create")}
                                    variant="outline"
                                    className="mt-4"
                                >
                                    画像を生成する
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {images.map(image => (
                                    <button
                                        key={image.id}
                                        onClick={() => setDetailImage(image)}
                                        className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all group"
                                    >
                                        <img
                                            src={image.image_url}
                                            alt={image.template_name || "Generated"}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-xs text-white font-medium truncate">
                                                {image.template_name || "カスタム"}
                                            </p>
                                            <p className="text-[10px] text-gray-300">
                                                {image.size_width}×{image.size_height}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 画像詳細モーダル */}
            <Dialog open={!!detailImage} onOpenChange={() => setDetailImage(null)}>
                <DialogContent className="max-w-lg rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-0 overflow-hidden">
                    {detailImage && (
                        <>
                            <div className="relative aspect-square">
                                <img
                                    src={detailImage.image_url}
                                    alt={detailImage.template_name || "Generated"}
                                    className="w-full h-full object-contain bg-gray-100 dark:bg-gray-800"
                                />
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {detailImage.template_name || "カスタム生成"}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {detailImage.size_width}×{detailImage.size_height} • {detailImage.model_used}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => handleDownload(detailImage)}
                                        className="flex-1"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        ダウンロード
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setDeleteTarget(detailImage);
                                            setDetailImage(null);
                                        }}
                                        variant="destructive"
                                        className="px-4"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* 削除確認モーダル */}
            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent className="max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">画像を削除</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        この画像を削除しますか？この操作は取り消せません。
                    </p>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                            className="border-white/10 text-white hover:bg-white/10"
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isPending}
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "削除"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
