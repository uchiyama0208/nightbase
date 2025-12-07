"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Trash2, MoreHorizontal, Loader2, Sparkles, Send } from "lucide-react";
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
    createBoardPost,
    updateBoardPost,
    deleteBoardPost,
    uploadRichEditorImage,
    generateBoardPost,
    type StorePost,
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

interface PostEditorProps {
    post: StorePost | null;
    storeId: string;
}

const VISIBILITY_OPTIONS = [
    { value: "staff", label: "スタッフ" },
    { value: "cast", label: "キャスト" },
    { value: "partner", label: "パートナー" },
];

export function PostEditor({ post, storeId }: PostEditorProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Form state
    const [title, setTitle] = useState("");
    const [content, setContent] = useState<any[]>([]);
    const [visibility, setVisibility] = useState<string[]>(["staff", "cast", "partner"]);

    // AI modal state
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiInput, setAiInput] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [editorKey, setEditorKey] = useState(0);

    // Initialize form when post changes
    useEffect(() => {
        if (post) {
            setTitle(post.title);
            setContent(post.content || []);
            setVisibility(post.visibility || ["staff", "cast", "partner"]);
            // エディタを再マウントして初期コンテンツを反映
            setEditorKey((prev) => prev + 1);
            // 既存の投稿はAI編集モードにする
            setHasGenerated(true);
        }
    }, [post]);

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

    const handleAIGenerate = async () => {
        if (!aiInput.trim()) return;

        setIsGenerating(true);
        setErrorMessage(null);

        try {
            let result: GeneratedPost;

            if (hasGenerated && (title || content.length > 0)) {
                // 既に生成済みの場合は変更リクエストとして処理
                result = await generateBoardPost(
                    "",
                    { title, content },
                    aiInput
                );
            } else {
                // 初回生成
                result = await generateBoardPost(aiInput);
            }

            // 結果をエディタに反映
            setTitle(result.title);
            setContent(result.content);
            setEditorKey((prev) => prev + 1); // エディタを再マウントして内容を反映
            setHasGenerated(true);
            setAiInput("");
            setShowAIModal(false);
        } catch (error) {
            console.error("Error generating post:", error);
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
            formData.append("coverImageUrl", "");
            formData.append("visibility", JSON.stringify(visibility));
            formData.append("status", status);

            if (post) {
                formData.append("postId", post.id);
                await updateBoardPost(formData);
            } else {
                await createBoardPost(formData);
            }

            router.push("/app/board");
            router.refresh();
        } catch (error) {
            console.error("Error saving post:", error);
            setErrorMessage("保存に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!post) return;
        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            await deleteBoardPost(post.id);
            router.push("/app/board");
            router.refresh();
        } catch (error) {
            console.error("Error deleting post:", error);
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
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        {post ? "投稿を編集" : "新規投稿"}
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
                {post && (
                    <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
                                <Trash2 className="h-4 w-4" />
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
                        placeholder="タイトルを入力"
                        className="h-11 rounded-lg border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 text-base"
                    />
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
                        key={`${post?.id || "new"}-${editorKey}`}
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
                <DialogContent className="max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
                            投稿を削除
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        この投稿を削除しますか？この操作は取り消せません。
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
                <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-50">
                            <Sparkles className="h-5 w-5 text-purple-500" />
                            AIで投稿を作成
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {hasGenerated && (title || content.length > 0)
                                ? "現在の内容に対する変更指示を入力してください"
                                : "投稿したい内容を簡単に説明してください。AIがタイトルと本文を生成します。"}
                        </p>
                        <Textarea
                            value={aiInput}
                            onChange={(e) => setAiInput(e.target.value)}
                            placeholder={
                                hasGenerated && (title || content.length > 0)
                                    ? "例: もっと短くして、箇条書きを追加して"
                                    : "例: 来週の月曜からドレスコードが変更になるお知らせ"
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
                                    <Send className="h-4 w-4 mr-2" />
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
