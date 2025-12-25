"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, Trash2, MoreHorizontal, Loader2, Upload, X, ImageIcon } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    createBoardPost,
    updateBoardPost,
    deleteBoardPost,
    uploadBoardCoverImage,
    deleteBoardCoverImage,
    type StorePost,
} from "./actions";

// Lazy load the rich editor
const RichEditor = dynamic(
    () => import("@/components/rich-editor").then((mod) => ({ default: mod.RichEditor })),
    {
        loading: () => (
            <div className="min-h-[300px] border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
        ),
        ssr: false,
    }
);

interface PostModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: StorePost | null;
    storeId: string;
}

const VISIBILITY_OPTIONS = [
    { value: "staff", label: "スタッフ" },
    { value: "cast", label: "キャスト" },
    { value: "partner", label: "パートナー" },
];

export function PostModal({ isOpen, onClose, post, storeId }: PostModalProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [title, setTitle] = useState("");
    const [content, setContent] = useState<any[]>([]);
    const [coverImageUrl, setCoverImageUrl] = useState("");
    const [visibility, setVisibility] = useState<string[]>(["staff", "cast", "partner"]);

    // Initialize form when post changes
    useEffect(() => {
        if (post) {
            setTitle(post.title);
            setContent(post.content || []);
            setCoverImageUrl(post.cover_image_url || "");
            setVisibility(post.visibility || ["staff", "cast", "partner"]);
        } else {
            setTitle("");
            setContent([]);
            setCoverImageUrl("");
            setVisibility(["staff", "cast", "partner"]);
        }
    }, [post, isOpen]);

    const handleClose = () => {
        setShowDeleteConfirm(false);
        setErrorMessage(null);
        setIsMenuOpen(false);
        onClose();
    };

    const handleContentChange = useCallback((newContent: any[]) => {
        setContent(newContent);
    }, []);

    const toggleVisibility = (value: string) => {
        setVisibility((prev) =>
            prev.includes(value)
                ? prev.filter((v) => v !== value)
                : [...prev, value]
        );
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            setErrorMessage("画像ファイルを選択してください");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setErrorMessage("ファイルサイズは5MB以下にしてください");
            return;
        }

        setIsUploading(true);
        setErrorMessage(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            const url = await uploadBoardCoverImage(formData);
            setCoverImageUrl(url);
        } catch (error) {
            console.error("Image upload failed:", error);
            setErrorMessage("画像のアップロードに失敗しました");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleRemoveImage = async () => {
        if (coverImageUrl) {
            try {
                await deleteBoardCoverImage(coverImageUrl);
            } catch (error) {
                console.error("Failed to delete image:", error);
            }
            setCoverImageUrl("");
        }
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
            formData.append("coverImageUrl", coverImageUrl);
            formData.append("visibility", JSON.stringify(visibility));
            formData.append("status", status);

            if (post) {
                formData.append("postId", post.id);
                await updateBoardPost(formData);
            } else {
                await createBoardPost(formData);
            }

            router.refresh();
            handleClose();
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
            router.refresh();
            handleClose();
        } catch (error) {
            console.error("Error deleting post:", error);
            setErrorMessage("削除に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md w-[95%] max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 p-0">
                <DialogHeader className="flex !flex-row items-center gap-2 h-14 min-h-[3.5rem] flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <DialogTitle className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white">
                        {post ? "投稿を編集" : "新規投稿"}
                    </DialogTitle>
                    <div className="w-8 h-8">
                        {post && (
                            <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <MoreHorizontal className="h-5 w-5" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-40 p-1" align="end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            setShowDeleteConfirm(true);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                        削除
                                    </button>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                </DialogHeader>

                {showDeleteConfirm ? (
                    <div className="space-y-4 px-6 py-4">
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
                    </div>
                ) : (
                    <>
                        <div className="space-y-4 px-6 py-4">
                            {/* Error message */}
                            {errorMessage && (
                                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        {errorMessage}
                                    </p>
                                </div>
                            )}

                            {/* Title */}
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    タイトル
                                </Label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="タイトルを入力"
                                    className="h-10 rounded-lg border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                                />
                            </div>

                            {/* Cover image upload */}
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    カバー画像（任意）
                                </Label>
                                {coverImageUrl ? (
                                    <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                        <img
                                            src={coverImageUrl}
                                            alt="カバー画像"
                                            className="w-full h-40 object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                                        >
                                            <X className="h-5 w-5 text-white" />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative h-32 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    アップロード中...
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <ImageIcon className="h-8 w-8 text-gray-400" />
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    クリックして画像を選択
                                                </span>
                                            </>
                                        )}
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                            </div>

                            {/* Visibility */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    公開対象
                                </Label>
                                <div className="flex flex-wrap gap-3">
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
                                    key={post?.id || "new"}
                                    initialContent={content}
                                    onChange={handleContentChange}
                                />
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                onClick={() => handleSubmit("draft")}
                                disabled={isSubmitting}
                                className="rounded-lg"
                            >
                                {isSubmitting ? "保存中..." : "下書き保存"}
                            </Button>
                            <Button
                                onClick={() => handleSubmit("published")}
                                disabled={isSubmitting}
                                className="rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            >
                                {isSubmitting ? "公開中..." : "公開"}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
