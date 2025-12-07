"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    ChevronLeft,
    Trash2,
    MoreHorizontal,
    Loader2,
    Upload,
    X,
    Eye,
    EyeOff,
    Tag,
} from "lucide-react";
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

export interface CmsEntry {
    id: string;
    type: string;
    slug: string;
    title: string;
    body: string | null;
    excerpt: string | null;
    tags: string[];
    cover_image_url: string | null;
    status: "draft" | "published";
    published_at: string | null;
    created_at: string;
    updated_at: string;
    metadata: any;
}

interface CmsEditorProps {
    entry: CmsEntry | null;
    type: "blog" | "case_study" | "manual";
    typeLabel: string;
    backUrl: string;
}

export function CmsEditor({ entry, type, typeLabel, backUrl }: CmsEditorProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Form state
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [excerpt, setExcerpt] = useState("");
    const [content, setContent] = useState<any[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [editorKey, setEditorKey] = useState(0);

    // Initialize form when entry changes
    useEffect(() => {
        if (entry) {
            setTitle(entry.title);
            setSlug(entry.slug);
            setExcerpt(entry.excerpt || "");
            setTags(entry.tags || []);
            setCoverImageUrl(entry.cover_image_url);
            // Parse body content
            if (entry.body) {
                try {
                    const parsed = JSON.parse(entry.body);
                    setContent(parsed);
                } catch {
                    // If not JSON, treat as plain text
                    setContent([{ type: "paragraph", content: [{ type: "text", text: entry.body }] }]);
                }
            }
            setEditorKey((prev) => prev + 1);
        }
    }, [entry]);

    // Auto-generate slug from title
    useEffect(() => {
        if (!entry && title) {
            const generatedSlug = title
                .toLowerCase()
                .replace(/[^\w\s\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, "")
                .replace(/\s+/g, "-")
                .slice(0, 100);
            setSlug(generatedSlug);
        }
    }, [title, entry]);

    const handleContentChange = useCallback((newContent: any[]) => {
        setContent(newContent);
    }, []);

    const handleEditorImageUpload = useCallback(async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "content");

        const res = await fetch("/api/admin/cms/upload", {
            method: "POST",
            body: formData,
        });

        if (!res.ok) {
            throw new Error("Upload failed");
        }

        const data = await res.json();
        return data.url;
    }, []);

    const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingCover(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("type", "cover");

            const res = await fetch("/api/admin/cms/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                throw new Error("Upload failed");
            }

            const data = await res.json();
            setCoverImageUrl(data.url);
        } catch (error) {
            console.error("Cover upload error:", error);
            setErrorMessage("カバー画像のアップロードに失敗しました");
        } finally {
            setIsUploadingCover(false);
        }
    };

    const addTag = () => {
        const tag = tagInput.trim();
        if (tag && !tags.includes(tag)) {
            setTags([...tags, tag]);
            setTagInput("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter((t) => t !== tagToRemove));
    };

    const handleSubmit = async (status: "draft" | "published") => {
        if (!title.trim()) {
            setErrorMessage("タイトルを入力してください");
            return;
        }

        if (!slug.trim()) {
            setErrorMessage("スラッグを入力してください");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const payload = {
                type,
                slug,
                title,
                body: JSON.stringify(content),
                excerpt: excerpt || null,
                tags,
                cover_image_url: coverImageUrl,
                status,
            };

            let res;
            if (entry) {
                res = await fetch(`/api/admin/cms/${entry.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            } else {
                res = await fetch("/api/admin/cms", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            }

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "保存に失敗しました");
            }

            router.push(backUrl);
            router.refresh();
        } catch (error: any) {
            console.error("Error saving entry:", error);
            setErrorMessage(error.message || "保存に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!entry) return;
        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const res = await fetch(`/api/admin/cms/${entry.id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                throw new Error("削除に失敗しました");
            }

            router.push(backUrl);
            router.refresh();
        } catch (error: any) {
            console.error("Error deleting entry:", error);
            setErrorMessage(error.message || "削除に失敗しました");
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
                        onClick={() => router.push(backUrl)}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        {entry ? `${typeLabel}を編集` : `新規${typeLabel}`}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    {entry && (
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
                    <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                </div>
            )}

            {/* Form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-6">
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

                        {/* Slug */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                スラッグ
                            </Label>
                            <Input
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="url-friendly-slug"
                                className="h-11 rounded-lg border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 text-base font-mono"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                URLに使用されます: /blog/{slug || "xxx"}
                            </p>
                        </div>

                        {/* Content editor */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                本文
                            </Label>
                            <RichEditor
                                key={`${entry?.id || "new"}-${editorKey}`}
                                initialContent={content.length > 0 ? content : undefined}
                                onChange={handleContentChange}
                                onUploadFile={handleEditorImageUpload}
                            />
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Cover Image */}
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6 space-y-4">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            カバー画像
                        </Label>
                        {coverImageUrl ? (
                            <div className="relative">
                                <img
                                    src={coverImageUrl}
                                    alt="Cover"
                                    className="w-full h-40 object-cover rounded-lg"
                                />
                                <button
                                    type="button"
                                    onClick={() => setCoverImageUrl(null)}
                                    className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                                {isUploadingCover ? (
                                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                ) : (
                                    <>
                                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            画像をアップロード
                                        </span>
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleCoverImageUpload}
                                    className="hidden"
                                    disabled={isUploadingCover}
                                />
                            </label>
                        )}
                    </div>

                    {/* Excerpt */}
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6 space-y-4">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            抜粋
                        </Label>
                        <Textarea
                            value={excerpt}
                            onChange={(e) => setExcerpt(e.target.value)}
                            placeholder="記事の概要を入力..."
                            className="min-h-[100px] rounded-lg border-gray-200 dark:border-gray-700 dark:bg-gray-800 resize-none"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            一覧ページや検索結果に表示されます
                        </p>
                    </div>

                    {/* Tags */}
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6 space-y-4">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            タグ
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                placeholder="タグを追加"
                                className="flex-1 h-9 rounded-lg"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        addTag();
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                size="sm"
                                onClick={addTag}
                                disabled={!tagInput.trim()}
                                className="rounded-lg"
                            >
                                追加
                            </Button>
                        </div>
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                    >
                                        <Tag className="h-3 w-3" />
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => removeTag(tag)}
                                            className="hover:text-blue-600 dark:hover:text-blue-200"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6 space-y-3">
                        <Button
                            onClick={() => handleSubmit("published")}
                            disabled={isSubmitting}
                            className="w-full rounded-lg bg-blue-600 text-white hover:bg-blue-700 h-11"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    保存中...
                                </>
                            ) : (
                                <>
                                    <Eye className="h-4 w-4 mr-2" />
                                    公開
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleSubmit("draft")}
                            disabled={isSubmitting}
                            className="w-full rounded-lg h-11"
                        >
                            <EyeOff className="h-4 w-4 mr-2" />
                            下書き保存
                        </Button>
                    </div>
                </div>
            </div>

            {/* Delete confirmation dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
                            {typeLabel}を削除
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        「{entry?.title}」を削除しますか？この操作は取り消せません。
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
        </div>
    );
}
