"use client";

import { useState, useEffect } from "react";
import { Heart, User } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { type LikeUser } from "./actions";

interface LikeButtonProps {
    itemId: string;
    type: "post" | "manual";
    initialLikes: {
        count: number;
        isLiked: boolean;
        users: LikeUser[];
    };
    onToggle: (itemId: string) => Promise<{ isLiked: boolean; count: number }>;
    onGetLikes: (itemId: string) => Promise<{ count: number; isLiked: boolean; users: LikeUser[] }>;
}

export function LikeButton({ itemId, type, initialLikes, onToggle, onGetLikes }: LikeButtonProps) {
    const [isLiked, setIsLiked] = useState(initialLikes.isLiked);
    const [count, setCount] = useState(initialLikes.count);
    const [users, setUsers] = useState<LikeUser[]>(initialLikes.users);
    const [isLoading, setIsLoading] = useState(false);
    const [showUsersModal, setShowUsersModal] = useState(false);

    // Update state when initialLikes changes (e.g., when modal opens with new item)
    useEffect(() => {
        setIsLiked(initialLikes.isLiked);
        setCount(initialLikes.count);
        setUsers(initialLikes.users);
    }, [initialLikes]);

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isLoading) return;

        setIsLoading(true);
        // Optimistic update
        const newIsLiked = !isLiked;
        const newCount = newIsLiked ? count + 1 : count - 1;
        setIsLiked(newIsLiked);
        setCount(newCount);

        try {
            const result = await onToggle(itemId);
            setIsLiked(result.isLiked);
            setCount(result.count);
            // Refresh users list
            const likesData = await onGetLikes(itemId);
            setUsers(likesData.users);
        } catch (error) {
            // Revert on error
            setIsLiked(isLiked);
            setCount(count);
            console.error("Error toggling like:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleShowUsers = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (count === 0) return;
        setShowUsersModal(true);
        // Refresh users list
        try {
            const likesData = await onGetLikes(itemId);
            setUsers(likesData.users);
        } catch (error) {
            console.error("Error fetching likes:", error);
        }
    };

    return (
        <>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={handleToggle}
                    disabled={isLoading}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                        isLiked
                            ? "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    )}
                >
                    <Heart
                        className={cn(
                            "h-4 w-4 transition-all",
                            isLiked && "fill-current",
                            isLoading && "animate-pulse"
                        )}
                    />
                    <span>いいね</span>
                </button>
                {count > 0 && (
                    <button
                        type="button"
                        onClick={handleShowUsers}
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:underline"
                    >
                        {count}人がいいね
                    </button>
                )}
            </div>

            {/* Users modal */}
            <Dialog open={showUsersModal} onOpenChange={setShowUsersModal}>
                <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
                            いいねした人
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-2 space-y-2 max-h-[300px] overflow-y-auto">
                        {users.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                まだいいねはありません
                            </p>
                        ) : (
                            users.map((user) => (
                                <div
                                    key={user.profile_id}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                >
                                    {user.avatar_url ? (
                                        <img
                                            src={user.avatar_url}
                                            alt=""
                                            className="h-8 w-8 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                            <User className="h-4 w-4 text-gray-400" />
                                        </div>
                                    )}
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        {user.display_name || "名前未設定"}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
