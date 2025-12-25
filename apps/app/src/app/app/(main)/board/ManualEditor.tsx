"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, Trash2, MoreHorizontal, Loader2, Sparkles, Send, Tag, Plus, X } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
    createManual,
    updateManual,
    deleteManual,
    uploadRichEditorImage,
    generateManual,
    createManualTag,
    type StoreManual,
    type ManualTag,
    type GeneratedPost,
} from "./actions";

// Lazy load the rich editor
const RichEditor = dynamic(
    () => import("@/components/rich-editor").then((mod) => ({ default: mod.RichEditor })),
    {
        loading: () => (
            <div className="min-h-[400px] border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
        ),
        ssr: false,
    }
);

interface ManualEditorProps {
    manual: StoreManual | null;
    storeId: string;
    availableTags: ManualTag[];
}

const VISIBILITY_OPTIONS = [
    { value: "staff", label: "スタッフ" },
    { value: "cast", label: "キャスト" },
    { value: "partner", label: "パートナー" },
];

export function ManualEditor({ manual, storeId, availableTags }: ManualEditorProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Form state
    const [title, setTitle] = useState("");
    const [content, setContent] = useState<any[]>([]);
    const [visibility, setVisibility] = useState<string[]>(["staff", "cast", "partner"]);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [tags, setTags] = useState<ManualTag[]>(availableTags);

    // Tag creation
    const [showTagInput, setShowTagInput] = useState(false);
    const [newTagName, setNewTagName] = useState("");
    const [isCreatingTag, setIsCreatingTag] = useState(false);

    // AI modal state
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiInput, setAiInput] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [editorKey, setEditorKey] = useState(0);

    // Initialize form when manual changes
    useEffect(() => {
        if (manual) {
            setTitle(manual.title);
            setContent(manual.content || []);
            setVisibility(manual.visibility || ["staff", "cast", "partner"]);
            setSelectedTagIds(manual.tags?.map(t => t.id) || []);
            setEditorKey((prev) => prev + 1);
            setHasGenerated(true);
        }
    }, [manual]);

    const handleContentChange = useCallback((newContent: any[]) => {
        setContent(newContent);
    }, []);

    const handleEditorImageUpload = useCallback(async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append("file", file);
        return uploadRichEditorImage(formData);
    }, []);

    const toggleVisibility = (value: string) => {
        setVisibility((prev) =>
            prev.includes(value)
                ? prev.filter((v) => v !== value)
                : [...prev, value]
        );
    };

    const toggleTag = (tagId: string) => {
        setSelectedTagIds((prev) =>
            prev.includes(tagId)
                ? prev.filter((id) => id !== tagId)
                : [...prev, tagId]
        );
    };

    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;

        setIsCreatingTag(true);
        try {
            const newTag = await createManualTag(storeId, newTagName.trim());
            setTags((prev) => [...prev, newTag]);
            setSelectedTagIds((prev) => [...prev, newTag.id]);
            setNewTagName("");
            setShowTagInput(false);
        } catch (error) {
            console.error("Error creating tag:", error);
            setErrorMessage("タグの作成に失敗しました");
        } finally {
            setIsCreatingTag(false);
        }
    };

    const handleAIGenerate = async () => {
        if (!aiInput.trim()) return;

        setIsGenerating(true);
        setErrorMessage(null);

        try {
            let result: GeneratedPost;

            if (hasGenerated && (title || content.length > 0)) {
                result = await generateManual(
                    "",
                    { title, content },
                    aiInput
                );
            } else {
                result = await generateManual(aiInput);
            }

            setTitle(result.title);
            setContent(result.content);
            setEditorKey((prev) => prev + 1);
            setHasGenerated(true);
            setAiInput("");
            setShowAIModal(false);
        } catch (error) {
            console.error("Error generating manual:", error);
            setErrorMessage("AIによる生成に失敗しました");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleOpenAIModal = () => {
        setAiInput("");
        setShowAIModal(true);
    };

    const handleSubmit = async (status: "draft" | "published") => {
        if (!title.trim()) {
            setErrorMessage("タイトルを入力してください");
            return;
        }

        if (visibility.length === 0) {
            setErrorMessage("公開対象を選択してください");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const formData = new FormData();
            formData.append("storeId", storeId);
            formData.append("title", title);
            formData.append("content", JSON.stringify(content));
            formData.append("visibility", JSON.stringify(visibility));
            formData.append("status", status);
            formData.append("tagIds", JSON.stringify(selectedTagIds));

            if (manual) {
                formData.append("manualId", manual.id);
                await updateManual(formData);
            } else {
                await createManual(formData);
            }

            router.push("/app/board");
            router.refresh();
        } catch (error) {
            console.error("Error saving manual:", error);
            setErrorMessage("保存に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!manual) return;
        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            await deleteManual(manual.id);
            router.push("/app/board");
            router.refresh();
        } catch (error) {
            console.error("Error deleting manual:", error);
            setErrorMessage("削除に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.push("/app/board")}
                        className="p-2 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        {manual ? "マニュアルを編集" : "新規マニュアル"}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    {/* AI Button */}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleOpenAIModal}
                        className="rounded-lg gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none hover:from-purple-600 hover:to-pink-600 hover:text-white"
                    >
                        <Sparkles className="h-4 w-4" />
                        AI
                    </Button>
                {manual && (
                    <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="p-2 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <MoreHorizontal className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-1" align="end">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    setShowDeleteConfirm(true);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            >
                                <Trash2 className="h-5 w-5" />
                                削除
                            </button>
                        </PopoverContent>
                    </Popover>
                )}
                </div>
            </div>

            {/* Error message */}
            {errorMessage && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {errorMessage}
                    </p>
                </div>
            )}

            {/* Form */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6 space-y-5">
                {/* Title */}
                <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        タイトル
                    </Label>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="マニュアルのタイトルを入力"
                        className="h-11 rounded-lg border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 text-base"
                    />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        タグ
                    </Label>
                    <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                            <button
                                key={tag.id}
                                type="button"
                                onClick={() => toggleTag(tag.id)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                    selectedTagIds.includes(tag.id)
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                }`}
                            >
                                <Tag className="h-3 w-3" />
                                {tag.name}
                                {selectedTagIds.includes(tag.id) && (
                                    <X className="h-3 w-3" />
                                )}
                            </button>
                        ))}
                        {showTagInput ? (
                            <div className="flex items-center gap-1">
                                <Input
                                    value={newTagName}
                                    onChange={(e) => setNewTagName(e.target.value)}
                                    placeholder="タグ名"
                                    className="h-8 w-32 text-xs"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleCreateTag();
                                        }
                                    }}
                                    disabled={isCreatingTag}
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleCreateTag}
                                    disabled={isCreatingTag || !newTagName.trim()}
                                    className="h-8 px-2"
                                >
                                    {isCreatingTag ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        "追加"
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setShowTagInput(false);
                                        setNewTagName("");
                                    }}
                                    className="h-8 px-2"
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowTagInput(true)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                <Plus className="h-3 w-3" />
                                新規タグ
                            </button>
                        )}
                    </div>
                </div>

                {/* Visibility */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        公開対象
                    </Label>
                    <div className="flex flex-wrap gap-4">
                        {VISIBILITY_OPTIONS.map((option) => (
                            <label
                                key={option.value}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <Checkbox
                                    checked={visibility.includes(option.value)}
                                    onCheckedChange={() => toggleVisibility(option.value)}
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {option.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Content editor */}
                <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        本文
                    </Label>
                    <RichEditor
                        key={`${manual?.id || "new"}-${editorKey}`}
                        initialContent={content}
                        onChange={handleContentChange}
                        onUploadFile={handleEditorImageUpload}
                    />
                </div>
            </div>

            {/* Footer buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
                <Button
                    variant="outline"
                    onClick={() => handleSubmit("draft")}
                    disabled={isSubmitting}
                    className="rounded-lg h-11 sm:h-10"
                >
                    {isSubmitting ? "保存中..." : "下書き保存"}
                </Button>
                <Button
                    onClick={() => handleSubmit("published")}
                    disabled={isSubmitting}
                    className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 h-11 sm:h-10"
                >
                    {isSubmitting ? "公開中..." : "公開"}
                </Button>
            </div>

            {/* Delete confirmation dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
                            マニュアルを削除
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        このマニュアルを削除しますか？この操作は取り消せません。
                    </p>
                    <DialogFooter className="gap-2">
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
                            disabled={isSubmitting}
                            className="rounded-lg"
                        >
                            {isSubmitting ? "削除中..." : "削除"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* AI Generation Modal */}
            <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
                <DialogContent className="sm:max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                            <Sparkles className="h-5 w-5 text-purple-500" />
                            AIでマニュアルを作成
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {hasGenerated && (title || content.length > 0)
                                ? "現在の内容に対する変更指示を入力してください"
                                : "マニュアルの内容を簡単に説明してください。AIがタイトルと本文を生成します。"}
                        </p>
                        <Textarea
                            value={aiInput}
                            onChange={(e) => setAiInput(e.target.value)}
                            placeholder={
                                hasGenerated && (title || content.length > 0)
                                    ? "例: もっと詳しく、手順を追加して"
                                    : "例: 新人キャストの接客マニュアル"
                            }
                            className="min-h-[120px] rounded-lg border-gray-200 dark:border-gray-700 dark:bg-gray-800 resize-none"
                            disabled={isGenerating}
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowAIModal(false)}
                            disabled={isGenerating}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleAIGenerate}
                            disabled={isGenerating || !aiInput.trim()}
                            className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none hover:from-purple-600 hover:to-pink-600"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    生成中...
                                </>
                            ) : (
                                <>
                                    <Send className="h-5 w-5 mr-2" />
                                    {hasGenerated && (title || content.length > 0) ? "変更を適用" : "生成する"}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
