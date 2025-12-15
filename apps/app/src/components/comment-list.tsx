"use client";

import { useState, useRef, useOptimistic, startTransition, useEffect } from "react";
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
    comments: initialComments,
    currentUserId,
    isAdmin = false,
    onAddComment,
    onEditComment,
    onDeleteComment,
    onToggleLike,
}: CommentListProps) {
    const [newComment, setNewComment] = useState("");
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState("");
    const [commentMenuOpen, setCommentMenuOpen] = useState<string | null>(null);
    const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
    const [likeAnimationKey, setLikeAnimationKey] = useState<Record<string, number>>({});
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Optimistic state for comments
    const [optimisticComments, addOptimisticComment] = useOptimistic(
        initialComments,
        (state: Comment[], action:
            | { type: "add"; comment: Comment }
            | { type: "edit"; id: string; content: string }
            | { type: "delete"; id: string }
            | { type: "toggle_like"; id: string }
        ) => {
            switch (action.type) {
                case "add":
                    return [...state, action.comment];
                case "edit":
                    return state.map((c) =>
                        c.id === action.id ? { ...c, content: action.content, updated_at: new Date().toISOString() } : c
                    );
                case "delete":
                    return state.filter((c) => c.id !== action.id);
                case "toggle_like":
                    return state.map((c) => {
                        if (c.id === action.id) {
                            const isLiked = !c.user_has_liked;
                            return {
                                ...c,
                                user_has_liked: isLiked,
                                like_count: (c.like_count || 0) + (isLiked ? 1 : -1),
                            };
                        }
                        return c;
                    });
                default:
                    return state;
            }
        }
    );

    const handleAdd = async () => {
        if (!newComment.trim()) return;

        const contentToAdd = newComment.trim();
        const tempId = Math.random().toString(36).substring(7);
        const tempComment: Comment = {
            id: tempId,
            content: contentToAdd,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            author_profile_id: currentUserId || "",
            // We might not have full author details instantly available if we don't pass them in,
            // but usually the parent component knows the current user details.
            // For now, we'll rely on the server refresh or just show a placeholder if needed.
            // Ideally, we should pass currentUser details to this component.
            // Assuming currentUserId is enough to identify ownership for now.
            author: {
                id: currentUserId || "",
                display_name: "自分", // Placeholder until refresh
                avatar_url: null,
            },
            like_count: 0,
            user_has_liked: false,
        };

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = '40px';
        }

        startTransition(() => {
            addOptimisticComment({ type: "add", comment: tempComment });
            setNewComment("");
        });

        const result = await onAddComment(contentToAdd);
        if (!result.success) {
            // Revert or show error (optimistic UI usually assumes success, 
            // handling failure gracefully is complex without a full sync mechanism,
            // but for now we just alert)
            alert("コメントの追加に失敗しました");
            // In a real app, we'd revert the optimistic state here, 
            // but useOptimistic resets automatically on next render with new props.
        }
    };

    const handleEdit = (commentId: string) => {
        if (!editingCommentText.trim()) return;

        const contentToSave = editingCommentText.trim();

        // Close edit mode immediately
        setEditingCommentId(null);
        setEditingCommentText("");

        // Optimistically update the comment
        startTransition(() => {
            addOptimisticComment({ type: "edit", id: commentId, content: contentToSave });
        });

        // Save in background
        onEditComment(commentId, contentToSave).then((result) => {
            if (!result.success) {
                alert("コメントの更新に失敗しました");
            }
        });
    };

    const handleDelete = (commentId: string) => {
        // Close modal immediately
        setDeleteCommentId(null);

        // Optimistically remove the comment
        startTransition(() => {
            addOptimisticComment({ type: "delete", id: commentId });
        });

        // Delete in background
        onDeleteComment(commentId).then((result) => {
            if (!result.success) {
                alert("コメントの削除に失敗しました");
            }
        });
    };

    const handleLike = (commentId: string) => {
        // Update animation key to trigger animation
        setLikeAnimationKey((prev) => ({
            ...prev,
            [commentId]: (prev[commentId] || 0) + 1,
        }));

        // Optimistically toggle the like
        startTransition(() => {
            addOptimisticComment({ type: "toggle_like", id: commentId });
        });

        // Fire and forget
        onToggleLike(commentId);
    };

    return (
        <div className="space-y-3">
            <div className="space-y-3">
                {optimisticComments.map((comment) => (
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
                                                disabled={comment.id.length < 30}
                                                className={cn(
                                                    "p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 transition-colors",
                                                    comment.id.length < 30 && "opacity-50 cursor-not-allowed"
                                                )}
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
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
                                                                className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
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
                                        <button
                                            type="button"
                                            onClick={() => handleLike(comment.id)}
                                            disabled={comment.id.length < 30}
                                            className={cn(
                                                "flex items-center gap-1 text-xs transition-colors",
                                                comment.user_has_liked
                                                    ? "text-red-500"
                                                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                                                comment.id.length < 30 && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            <Heart
                                                key={`heart-${comment.id}-${likeAnimationKey[comment.id] || 0}`}
                                                className={cn(
                                                    "h-3.5 w-3.5 transition-transform duration-200",
                                                    comment.user_has_liked && "fill-current animate-like-bounce"
                                                )}
                                            />
                                            <span>{comment.like_count || 0 > 0 ? comment.like_count : "いいね"}</span>
                                        </button>
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
                    disabled={!newComment.trim()}
                    size="icon"
                    className="h-10 w-10 rounded-full flex-shrink-0"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deleteCommentId} onOpenChange={(open) => !open && setDeleteCommentId(null)}>
                <DialogContent className="sm:max-w-[400px] bg-white dark:bg-gray-800 w-[90%] rounded-lg p-6">
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
                    <DialogFooter className="flex-col sm:flex-row gap-3">
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
