"use server";

import { unstable_noStore as noStore } from "next/cache";
import { createServerClient } from "@/lib/supabaseServerClient";

// Comment target types
export type CommentTargetType =
    | "bottle_keep"
    | "menu"
    | "table"
    | "session"
    | "work_record"
    | "profile"
    | "submission";

// Map target type to database column name
const TARGET_COLUMN_MAP: Record<CommentTargetType, string> = {
    bottle_keep: "target_bottle_keep_id",
    menu: "target_menu_id",
    table: "target_table_id",
    session: "target_session_id",
    work_record: "target_work_record_id",
    profile: "target_profile_id",
    submission: "target_submission_id",
};

/**
 * Get comments for a specific target
 */
export async function getComments(targetType: CommentTargetType, targetId: string) {
    noStore();

    try {
        const authSupabase = await createServerClient() as any;
        const { data: { user } } = await authSupabase.auth.getUser();

        let currentProfileId: string | null = null;
        if (user) {
            const { data: appUser } = await authSupabase
                .from("users")
                .select("current_profile_id")
                .eq("id", user.id)
                .maybeSingle();
            currentProfileId = appUser?.current_profile_id || null;
        }

        const targetColumn = TARGET_COLUMN_MAP[targetType];
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const fetchUrl = `${supabaseUrl}/rest/v1/comments?${targetColumn}=eq.${targetId}&select=*,author:profiles!comments_author_profile_id_fkey(id,display_name,avatar_url)&order=created_at.asc`;

        const response = await fetch(fetchUrl, {
            headers: {
                'apikey': serviceRoleKey!,
                'Authorization': `Bearer ${serviceRoleKey}`,
            },
            cache: 'no-store',
        });

        const responseText = await response.text();

        let comments: any[];
        try {
            comments = JSON.parse(responseText);
        } catch (parseError) {
            console.error("[getComments] JSON parse error:", parseError);
            return [];
        }

        if (!response.ok) {
            console.error("[getComments] Error response:", comments);
            return [];
        }

        if (!comments || comments.length === 0) {
            return [];
        }

        const commentIds = comments.map((c: any) => c.id);

        const { data: allLikes } = await authSupabase
            .from("comment_likes")
            .select("comment_id, profile_id")
            .in("comment_id", commentIds);

        const likesMap = new Map<string, { count: number; userHasLiked: boolean }>();

        commentIds.forEach((id: any) => {
            const commentLikes = allLikes?.filter((like: any) => like.comment_id === id) || [];
            likesMap.set(id, {
                count: commentLikes.length,
                userHasLiked: commentLikes.some((like: any) => like.profile_id === currentProfileId),
            });
        });

        const commentsWithLikes = comments.map((comment: any) => {
            const likeData = likesMap.get(comment.id) || { count: 0, userHasLiked: false };
            return {
                ...comment,
                like_count: likeData.count,
                user_has_liked: likeData.userHasLiked,
            };
        });

        return commentsWithLikes;
    } catch (error) {
        console.error("[getComments] Error:", error);
        return [];
    }
}

/**
 * Add a comment to a specific target
 */
export async function addComment(targetType: CommentTargetType, targetId: string, content: string) {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) throw new Error("No profile");

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile?.store_id) throw new Error("No store");

    const targetColumn = TARGET_COLUMN_MAP[targetType];

    const insertData: Record<string, any> = {
        store_id: currentProfile.store_id,
        author_profile_id: appUser.current_profile_id,
        content: content,
    };
    insertData[targetColumn] = targetId;

    const { error } = await supabase.from("comments").insert(insertData);

    if (error) throw new Error(error.message);

    return { success: true };
}

/**
 * Update a comment
 */
export async function updateComment(commentId: string, content: string) {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) throw new Error("No profile");

    const { data: comment } = await supabase
        .from("comments")
        .select("author_profile_id")
        .eq("id", commentId)
        .maybeSingle();

    if (!comment || comment.author_profile_id !== appUser.current_profile_id) {
        throw new Error("Unauthorized");
    }

    const { error } = await supabase
        .from("comments")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", commentId);

    if (error) throw new Error(error.message);

    return { success: true };
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string) {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) throw new Error("No profile");

    const { data: comment } = await supabase
        .from("comments")
        .select("author_profile_id")
        .eq("id", commentId)
        .maybeSingle();

    if (!comment || comment.author_profile_id !== appUser.current_profile_id) {
        throw new Error("Unauthorized");
    }

    const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

    if (error) throw new Error(error.message);

    return { success: true };
}

/**
 * Toggle like on a comment
 */
export async function toggleCommentLike(commentId: string) {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) throw new Error("No profile");

    const { data: existingLike } = await supabase
        .from("comment_likes")
        .select("id")
        .eq("comment_id", commentId)
        .eq("profile_id", appUser.current_profile_id)
        .maybeSingle();

    if (existingLike) {
        await supabase
            .from("comment_likes")
            .delete()
            .eq("id", existingLike.id);
    } else {
        await supabase
            .from("comment_likes")
            .insert({
                comment_id: commentId,
                profile_id: appUser.current_profile_id,
            });
    }

    return { success: true };
}

/**
 * Get current user's profile ID
 */
export async function getCurrentUserProfileId() {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    return appUser?.current_profile_id || null;
}
