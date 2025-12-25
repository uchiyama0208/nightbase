"use client";

import { useState, useEffect } from "react";
import { CommentList } from "@/components/comment-list";
import {
    getComments,
    addComment,
    updateComment,
    deleteComment,
    toggleCommentLike,
    getCurrentUserProfileId,
    CommentTargetType,
} from "@/lib/comments";

interface CommentSectionProps {
    targetType: CommentTargetType;
    targetId: string;
    isOpen: boolean;
}

export function CommentSection({ targetType, targetId, isOpen }: CommentSectionProps) {
    const [comments, setComments] = useState<any[]>([]);
    const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);

    // Load comments when section opens
    useEffect(() => {
        if (isOpen && targetId) {
            getComments(targetType, targetId).then(setComments);
            getCurrentUserProfileId().then(setCurrentUserProfileId);
        }
        if (!isOpen) {
            setComments([]);
        }
    }, [isOpen, targetId, targetType]);

    const handleAddComment = async (content: string): Promise<{ success: boolean; error?: string }> => {
        if (!targetId) return { success: false, error: "No target ID" };
        try {
            await addComment(targetType, targetId, content);
            const newComments = await getComments(targetType, targetId);
            setComments(newComments);
            return { success: true };
        } catch (error) {
            console.error("Error adding comment:", error);
            return { success: false, error: "Failed to add comment" };
        }
    };

    const handleEditComment = async (commentId: string, content: string): Promise<{ success: boolean; error?: string }> => {
        if (!targetId) return { success: false, error: "No target ID" };
        try {
            await updateComment(commentId, content);
            const newComments = await getComments(targetType, targetId);
            setComments(newComments);
            return { success: true };
        } catch (error) {
            console.error("Error updating comment:", error);
            return { success: false, error: "Failed to update comment" };
        }
    };

    const handleDeleteComment = async (commentId: string): Promise<{ success: boolean; error?: string }> => {
        if (!targetId) return { success: false, error: "No target ID" };
        try {
            await deleteComment(commentId);
            const newComments = await getComments(targetType, targetId);
            setComments(newComments);
            return { success: true };
        } catch (error) {
            console.error("Error deleting comment:", error);
            return { success: false, error: "Failed to delete comment" };
        }
    };

    const handleToggleLike = async (commentId: string): Promise<{ success: boolean; error?: string }> => {
        if (!targetId) return { success: false, error: "No target ID" };
        try {
            await toggleCommentLike(commentId);
            const newComments = await getComments(targetType, targetId);
            setComments(newComments);
            return { success: true };
        } catch (error) {
            console.error("Error toggling like:", error);
            return { success: false, error: "Failed to toggle like" };
        }
    };

    return (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-white">コメント</h3>
            <CommentList
                comments={comments}
                currentUserId={currentUserProfileId}
                onAddComment={handleAddComment}
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
                onToggleLike={handleToggleLike}
            />
        </div>
    );
}
