"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { UserCircle, MoreHorizontal, Edit2, Trash2, Heart, Send } from "lucide-react";
import { cn, formatJSTDate } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

interface Comment {
    id: string;
    content: string;
    created_at: string;
    updated_at: string;
    author_profile_id: string;
    author?: {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
    };
    like_count?: number;
    user_has_liked?: boolean;
}

interface CommentListProps {
    comments: Comment[];
    currentUserId: string | null;
    isAdmin?: boolean;
    onAddComment: (content: string) => Promise<{ success: boolean; error?: string }>;
    onEditComment: (commentId: string, content: string) => Promise<{ success: boolean; error?: string }>;
    onDeleteComment: (commentId: string) => Promise<{ success: boolean; error?: string }>;
    onToggleLike: (commentId: string) => Promise<{ success: boolean; error?: string }>;
}

export function CommentList({
    comments,
    currentUserId,
    isAdmin = false,
    onAddComment,
    onEditComment,
    onDeleteComment,
    onToggleLike,
}: CommentListProps) {
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState("");
    const [commentMenuOpen, setCommentMenuOpen] = useState<string | null>(null);
    const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
    const [likeAnimationKey, setLikeAnimationKey] = useState<Record<string, number>>({});
    const [optimisticLikes, setOptimisticLikes] = useState<Record<string, { liked: boolean; count: number } | null>>({});
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleAdd = async () => {
        if (!newComment.trim() || isSubmitting) return;

        const contentToAdd = newComment.trim();
        setNewComment("");
        setIsSubmitting(true);

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = '40px';
        }

        const result = await onAddComment(contentToAdd);
        setIsSubmitting(false);

        if (!result.success) {
            setNewComment(contentToAdd); // Restore on failure
            toast({ title: "コメントの追加に失敗しました", variant: "destructive" });
        }
    };

    const handleEdit = async (commentId: string) => {
        if (!editingCommentText.trim()) return;

        const contentToSave = editingCommentText.trim();
        setEditingCommentId(null);
        setEditingCommentText("");

        const result = await onEditComment(commentId, contentToSave);
        if (!result.success) {
            toast({ title: "コメントの更新に失敗しました", variant: "destructive" });
        }
    };

    const handleDelete = async (commentId: string) => {
        setDeleteCommentId(null);

        const result = await onDeleteComment(commentId);
        if (!result.success) {
            toast({ title: "コメントの削除に失敗しました", variant: "destructive" });
        }
    };

    const handleLike = async (commentId: string) => {
        const comment = comments.find(c => c.id === commentId);
        if (!comment) return;

        // Get current state (optimistic or original)
        const currentLiked = optimisticLikes[commentId]?.liked ?? comment.user_has_liked ?? false;
        const currentCount = optimisticLikes[commentId]?.count ?? comment.like_count ?? 0;

        // Optimistic update
        const newLiked = !currentLiked;
        const newCount = newLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

        setOptimisticLikes(prev => ({
            ...prev,
            [commentId]: { liked: newLiked, count: newCount }
        }));

        setLikeAnimationKey((prev) => ({
            ...prev,
            [commentId]: (prev[commentId] || 0) + 1,
        }));

        const result = await onToggleLike(commentId);

        if (!result.success) {
            // Revert on failure
            setOptimisticLikes(prev => ({
                ...prev,
                [commentId]: { liked: currentLiked, count: currentCount }
            }));
        } else {
            // Clear optimistic state after successful update (let parent state take over)
            setOptimisticLikes(prev => ({
                ...prev,
                [commentId]: null
            }));
        }
    };

    return (
        <div className="space-y-3">
            <div className="space-y-3">
                {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 items-start group">
                        <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                            <AvatarImage src={comment.author?.avatar_url || ""} />
                            <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                                <UserCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {comment.author?.display_name || "不明なユーザー"}
                                </span>
                                <div className="flex items-center gap-2 flex-shrink-0 text-xs text-gray-500">
                                    <span>{formatJSTDate(comment.created_at)}</span>
                                    {(comment.author_profile_id === currentUserId || isAdmin) && (
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setCommentMenuOpen(commentMenuOpen === comment.id ? null : comment.id)}
                                                className="p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full text-gray-500 transition-colors"
                                            >
                                                <MoreHorizontal className="h-5 w-5" />
                                            </button>
                                            {commentMenuOpen === comment.id && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-40"
                                                        onClick={() => setCommentMenuOpen(null)}
                                                    />
                                                    <div className="absolute right-0 top-6 z-50 w-32 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-1 flex flex-col gap-1 text-xs">
                                                        {comment.author_profile_id === currentUserId && (
                                                            <button
                                                                type="button"
                                                                className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                                onClick={() => {
                                                                    setEditingCommentId(comment.id);
                                                                    setEditingCommentText(comment.content);
                                                                    setCommentMenuOpen(null);
                                                                }}
                                                            >
                                                                <Edit2 className="h-3 w-3" />
                                                                編集
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            onClick={() => {
                                                                setDeleteCommentId(comment.id);
                                                                setCommentMenuOpen(null);
                                                            }}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                            削除
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {editingCommentId === comment.id ? (
                                <div className="space-y-2">
                                    <Textarea
                                        value={editingCommentText}
                                        onChange={(e) => setEditingCommentText(e.target.value)}
                                        className="min-h-[80px] bg-white dark:bg-gray-900"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                setEditingCommentId(null);
                                                setEditingCommentText("");
                                            }}
                                        >
                                            キャンセル
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => handleEdit(comment.id)}
                                        >
                                            保存
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative group/bubble">
                                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                                        {comment.content}
                                    </div>
                                    <div className="mt-1 flex items-center gap-4 px-1">
                                        {(() => {
                                            const isLiked = optimisticLikes[comment.id]?.liked ?? comment.user_has_liked ?? false;
                                            const likeCount = optimisticLikes[comment.id]?.count ?? comment.like_count ?? 0;
                                            return (
                                                <button
                                                    type="button"
                                                    onClick={() => handleLike(comment.id)}
                                                    className={cn(
                                                        "flex items-center gap-1 text-xs transition-colors",
                                                        isLiked
                                                            ? "text-red-500"
                                                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                                    )}
                                                >
                                                    <Heart
                                                        key={`heart-${comment.id}-${likeAnimationKey[comment.id] || 0}`}
                                                        className={cn(
                                                            "h-3.5 w-3.5 transition-transform duration-200",
                                                            isLiked && "fill-current animate-like-bounce"
                                                        )}
                                                    />
                                                    <span>{likeCount > 0 ? likeCount : "いいね"}</span>
                                                </button>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-2 items-start">
                <div className="relative flex-1">
                    <Textarea
                        ref={textareaRef}
                        value={newComment}
                        onChange={(e) => {
                            setNewComment(e.target.value);
                            // Auto-resize textarea
                            const target = e.target;
                            target.style.height = 'auto';
                            target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                        }}
                        placeholder="コメントを入力..."
                        className="min-h-[40px] max-h-[120px] py-2 pr-10 resize-none rounded-2xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-0 overflow-hidden text-base"
                        rows={1}
                        style={{ height: '40px' }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                handleAdd();
                            }
                        }}
                    />
                </div>
                <Button
                    type="button"
                    onClick={handleAdd}
                    disabled={!newComment.trim() || isSubmitting}
                    size="icon"
                    className="h-10 w-10 rounded-full flex-shrink-0"
                >
                    <Send className="h-5 w-5" />
                </Button>
            </div>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deleteCommentId} onOpenChange={(open) => !open && setDeleteCommentId(null)}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 w-[90%] rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-center text-lg font-bold text-gray-900 dark:text-white">
                            コメントを削除
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            コメントを削除する確認ダイアログ
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 text-center text-gray-600 dark:text-gray-300">
                        <p>本当にこのコメントを削除しますか？</p>
                        <p className="text-sm mt-2 text-gray-500">この操作は取り消せません。</p>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => deleteCommentId && handleDelete(deleteCommentId)}
                            className="w-full rounded-full bg-red-600 hover:bg-red-700 text-white h-10"
                        >
                            削除
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteCommentId(null)}
                            className="w-full rounded-full border-gray-300 dark:border-gray-600 h-10"
                        >
                            キャンセル
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
