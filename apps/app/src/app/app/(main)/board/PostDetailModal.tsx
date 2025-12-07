"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MoreHorizontal, Pencil, Trash2, User } from "lucide-react";
import { formatJSTDateTime } from "@/lib/utils";
import { type StorePost, type LikeUser, deleteBoardPost, getPostLikes, togglePostLike, markPostAsRead } from "./actions";
import { LikeButton } from "./LikeButton";

// Lazy load the rich viewer
const RichViewer = dynamic(
    () => import("@/components/rich-editor").then((mod) => ({ default: mod.RichViewer })),
    {
        loading: () => (
            <div className="min-h-[200px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
        ),
        ssr: false,
    }
);

interface PostDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: StorePost | null;
    isStaff: boolean;
}

export function PostDetailModal({ isOpen, onClose, post, isStaff }: PostDetailModalProps) {
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [likes, setLikes] = useState<{ count: number; isLiked: boolean; users: LikeUser[] }>({
        count: 0,
        isLiked: false,
        users: [],
    });

    // Fetch likes and mark as read when modal opens
    useEffect(() => {
        if (isOpen && post) {
            getPostLikes(post.id).then(setLikes);
            // Mark as read (fire and forget)
            markPostAsRead(post.id);
        }
    }, [isOpen, post?.id]);

    if (!post) return null;

    const handleEdit = () => {
        setIsMenuOpen(false);
        onClose();
        router.push(`/app/board/${post.id}/edit`);
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteBoardPost(post.id);
            setShowDeleteConfirm(false);
            onClose();
            router.refresh();
        } catch (error) {
            console.error("Error deleting post:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="relative flex flex-row items-center justify-center space-y-0 pb-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute left-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50 px-8 text-center">
                            {post.title}
                        </DialogTitle>
                        {isStaff && (
                            <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="absolute right-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <MoreHorizontal className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-36 p-1" align="end">
                                    <button
                                        type="button"
                                        onClick={handleEdit}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                    >
                                        <Pencil className="h-4 w-4" />
                                        編集
                                    </button>
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
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
                        {/* Meta info with avatar */}
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            {post.creator?.avatar_url ? (
                                <img
                                    src={post.creator.avatar_url}
                                    alt=""
                                    className="h-5 w-5 rounded-full object-cover"
                                />
                            ) : (
                                <div className="h-5 w-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <User className="h-3 w-3 text-gray-400" />
                                </div>
                            )}
                            {post.creator?.display_name && (
                                <span>{post.creator.display_name}</span>
                            )}
                            <span>・</span>
                            <span>
                                {post.published_at
                                    ? formatJSTDateTime(post.published_at)
                                    : formatJSTDateTime(post.created_at)}
                            </span>
                        </div>

                        {/* Content */}
                        <div className="prose prose-gray dark:prose-invert max-w-none">
                            <RichViewer content={post.content || []} />
                        </div>

                        {/* Like button */}
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <LikeButton
                                itemId={post.id}
                                type="post"
                                initialLikes={likes}
                                onToggle={togglePostLike}
                                onGetLikes={getPostLikes}
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

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
                            disabled={isDeleting}
                            className="rounded-lg"
                        >
                            {isDeleting ? "削除中..." : "削除"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
