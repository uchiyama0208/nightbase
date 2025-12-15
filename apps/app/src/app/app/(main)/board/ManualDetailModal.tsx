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
import { ChevronLeft, Loader2, MoreHorizontal, Pencil, Trash2, User, Tag } from "lucide-react";
import { formatJSTDateTime } from "@/lib/utils";
import { type StoreManual, type LikeUser, deleteManual, getManualLikes, toggleManualLike, markManualAsRead } from "./actions";
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

interface ManualDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    manual: StoreManual | null;
    isStaff: boolean;
}

export function ManualDetailModal({ isOpen, onClose, manual, isStaff }: ManualDetailModalProps) {
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
        if (isOpen && manual) {
            getManualLikes(manual.id).then(setLikes);
            // Mark as read (fire and forget)
            markManualAsRead(manual.id);
        }
    }, [isOpen, manual?.id]);

    if (!manual) return null;

    const handleEdit = () => {
        setIsMenuOpen(false);
        onClose();
        router.push(`/app/board/manual/${manual.id}/edit`);
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteManual(manual.id);
            setShowDeleteConfirm(false);
            onClose();
            router.refresh();
        } catch (error) {
            console.error("Error deleting manual:", error);
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
                            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50 px-8 text-center">
                            {manual.title}
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
                        {/* Tags */}
                        {manual.tags && manual.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {manual.tags.map((tag) => (
                                    <span
                                        key={tag.id}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                    >
                                        <Tag className="h-3 w-3" />
                                        {tag.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Meta info with avatar */}
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            {manual.creator?.avatar_url ? (
                                <img
                                    src={manual.creator.avatar_url}
                                    alt=""
                                    className="h-5 w-5 rounded-full object-cover"
                                />
                            ) : (
                                <div className="h-5 w-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <User className="h-3 w-3 text-gray-400" />
                                </div>
                            )}
                            {manual.creator?.display_name && (
                                <span>{manual.creator.display_name}</span>
                            )}
                            <span>・</span>
                            <span>更新: {formatJSTDateTime(manual.updated_at)}</span>
                        </div>

                        {/* Content */}
                        <div className="prose prose-gray dark:prose-invert max-w-none">
                            <RichViewer content={manual.content || []} />
                        </div>

                        {/* Like button */}
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <LikeButton
                                itemId={manual.id}
                                type="manual"
                                initialLikes={likes}
                                onToggle={toggleManualLike}
                                onGetLikes={getManualLikes}
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
