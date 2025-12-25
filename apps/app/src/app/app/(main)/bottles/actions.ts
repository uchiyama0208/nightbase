"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { createServerClient, createServiceRoleClient } from "@/lib/supabaseServerClient";
import { getAppData, hasPagePermission } from "../../data-access";
import { getMenus } from "../menus/actions";

/**
 * ボトルページ用のデータを取得
 */
export async function getBottlesPageData() {
    const { profile, permissions } = await getAppData();

    if (!profile?.store_id) {
        throw new Error("No store found");
    }

    const supabase = await createServerClient() as any;

    // Fetch menus for bottle selection
    const menus = await getMenus();

    // Fetch all profiles in this store (for guest selection) - 在籍中・体入のみ
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, role, status")
        .eq("store_id", profile.store_id)
        .in("status", ["在籍中", "体入"])
        .order("display_name");

    // 各ページの権限をチェック
    const pagePermissions = {
        bottles: hasPagePermission("bottles", "view", profile, permissions ?? null),
        resumes: hasPagePermission("resumes", "view", profile, permissions ?? null),
        salarySystems: hasPagePermission("salary-systems", "view", profile, permissions ?? null),
        attendance: hasPagePermission("attendance", "view", profile, permissions ?? null),
        personalInfo: hasPagePermission("users-personal-info", "view", profile, permissions ?? null),
    };

    return {
        storeId: profile.store_id,
        menus: menus || [],
        profiles: profiles || [],
        pagePermissions,
    };
}

export async function getBottleKeeps(filters?: {
    remainingAmount?: string;
    search?: string;
}) {
    const supabase = await createServerClient() as any;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("No profile found");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile?.store_id) {
        throw new Error("No store found");
    }

    let query = supabase
        .from("bottle_keeps")
        .select(`
      *,
      menus (
        id,
        name,
        price
      ),
      bottle_keep_holders (
        profile_id,
        profiles (
          id,
          display_name,
          display_name_kana
        )
      )
    `)
        .eq("store_id", profile.store_id)
        .order("created_at", { ascending: false });

    if (filters?.remainingAmount && filters.remainingAmount !== "all") {
        query = query.eq("remaining_amount", parseInt(filters.remainingAmount));
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching bottle keeps:", error);
        throw error;
    }

    // Filter by search term if provided
    if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        return data?.filter((bottle: any) => {
            const bottleName = bottle.menus?.name?.toLowerCase() || "";
            const guestNames = bottle.bottle_keep_holders
                ?.map((h: any) => h.profiles?.display_name?.toLowerCase() || "")
                .join(" ");
            const guestNamesKana = bottle.bottle_keep_holders
                ?.map((h: any) => h.profiles?.display_name_kana?.toLowerCase() || "")
                .join(" ");
            return bottleName.includes(searchLower) || guestNames.includes(searchLower) || guestNamesKana.includes(searchLower);
        });
    }

    return data;
}

export async function createBottleKeep(formData: FormData) {
    const supabase = await createServerClient() as any;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("No profile found");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile?.store_id) {
        throw new Error("No store found");
    }

    const menuIdRaw = formData.get("menu_id") as string;
    const menuId = menuIdRaw && menuIdRaw.trim() !== "" ? menuIdRaw : null;
    const remainingAmount = parseInt(formData.get("remaining_amount") as string) || 100;
    const openedAt = formData.get("opened_at") as string;
    const expirationDateRaw = formData.get("expiration_date") as string;
    const expirationDate = expirationDateRaw && expirationDateRaw.trim() !== "" ? expirationDateRaw : null;
    const profileIdsString = formData.get("profile_ids") as string;
    const profileIds = profileIdsString ? JSON.parse(profileIdsString) : [];

    // Create bottle keep record
    const { data: bottleKeep, error: bottleError } = await supabase
        .from("bottle_keeps")
        .insert({
            store_id: profile.store_id,
            menu_id: menuId,
            remaining_amount: remainingAmount,
            opened_at: openedAt,
            expiration_date: expirationDate,
        })
        .select()
        .single();

    if (bottleError) {
        console.error("Error creating bottle keep:", JSON.stringify(bottleError, null, 2));
        console.error("Insert data:", { store_id: profile.store_id, menu_id: menuId, remaining_amount: remainingAmount, opened_at: openedAt, expiration_date: expirationDate });
        throw new Error(`Failed to create bottle keep: ${bottleError.message} (code: ${bottleError.code})`);
    }

    // Create bottle keep holders (guest associations)
    if (profileIds.length > 0) {
        const holders = profileIds.map((profileId: string) => ({
            bottle_keep_id: bottleKeep.id,
            profile_id: profileId,
        }));

        const { error: holdersError } = await supabase
            .from("bottle_keep_holders")
            .insert(holders);

        if (holdersError) {
            console.error("Error creating bottle keep holders:", holdersError);
            throw holdersError;
        }
    }

    revalidatePath("/app/bottles");
    return { success: true };
}

export async function updateBottleKeep(id: string, formData: FormData) {
    const supabase = await createServerClient() as any;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const menuIdRaw = formData.get("menu_id") as string;
    const menuId = menuIdRaw && menuIdRaw.trim() !== "" ? menuIdRaw : null;
    const remainingAmount = parseInt(formData.get("remaining_amount") as string);
    const expirationDateRaw = formData.get("expiration_date") as string;
    const expirationDate = expirationDateRaw && expirationDateRaw.trim() !== "" ? expirationDateRaw : null;
    const profileIdsString = formData.get("profile_ids") as string;
    const profileIds = profileIdsString ? JSON.parse(profileIdsString) : [];

    // Update bottle keep
    const { error: updateError } = await supabase
        .from("bottle_keeps")
        .update({
            menu_id: menuId,
            remaining_amount: remainingAmount,
            expiration_date: expirationDate,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id);

    if (updateError) {
        console.error("Error updating bottle keep:", updateError);
        throw updateError;
    }

    // Update holders: delete existing and insert new
    await supabase
        .from("bottle_keep_holders")
        .delete()
        .eq("bottle_keep_id", id);

    if (profileIds.length > 0) {
        const holders = profileIds.map((profileId: string) => ({
            bottle_keep_id: id,
            profile_id: profileId,
        }));

        const { error: holdersError } = await supabase
            .from("bottle_keep_holders")
            .insert(holders);

        if (holdersError) {
            console.error("Error updating bottle keep holders:", holdersError);
            throw holdersError;
        }
    }

    revalidatePath("/app/bottles");
    return { success: true };
}

export async function deleteBottleKeep(id: string) {
    const supabase = await createServerClient() as any;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const { error } = await supabase
        .from("bottle_keeps")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting bottle keep:", error);
        throw error;
    }

    revalidatePath("/app/bottles");
    return { success: true };
}

// Comment-related actions (using generalized comments table)
export async function getBottleKeepComments(bottleKeepId: string) {
    noStore(); // Disable caching for fresh data

    try {
        // Get current user for like status
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

        // Use direct fetch with explicit FK relationship to avoid PostgREST ambiguity
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const fetchUrl = `${supabaseUrl}/rest/v1/comments?target_bottle_keep_id=eq.${bottleKeepId}&select=*,author:profiles!comments_author_profile_id_fkey(id,display_name,avatar_url)&order=created_at.asc`;

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
            console.error("[getBottleKeepComments] JSON parse error:", parseError);
            return [];
        }

        if (!response.ok) {
            console.error("[getBottleKeepComments] Error response:", comments);
            return [];
        }

        if (!comments || comments.length === 0) {
            return [];
        }

        // Get all comment IDs
        const commentIds = comments.map((c: any) => c.id);

        // Fetch all likes for these comments in one query
        const { data: allLikes } = await authSupabase
            .from("comment_likes")
            .select("comment_id, profile_id")
            .in("comment_id", commentIds);

        // Create a map of comment_id -> like count and user's like status
        const likesMap = new Map<string, { count: number; userHasLiked: boolean }>();

        commentIds.forEach((id: any) => {
            const commentLikes = allLikes?.filter((like: any) => like.comment_id === id) || [];
            likesMap.set(id, {
                count: commentLikes.length,
                userHasLiked: commentLikes.some((like: any) => like.profile_id === currentProfileId),
            });
        });

        // Add like data to comments
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
        console.error("[getBottleKeepComments] Error:", error);
        return [];
    }
}

export async function addBottleKeepComment(bottleKeepId: string, content: string) {
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

    const { error } = await supabase.from("comments").insert({
        store_id: currentProfile.store_id,
        target_bottle_keep_id: bottleKeepId,
        target_profile_id: null,
        author_profile_id: appUser.current_profile_id,
        content: content,
    });

    if (error) throw new Error(error.message);

    // revalidatePath を削除 - コメントは loadComments() で手動更新するため
    return { success: true };
}

export async function updateBottleKeepComment(commentId: string, content: string) {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) throw new Error("No profile");

    // Verify user is the author
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

    // revalidatePath を削除 - コメントは loadComments() で手動更新するため
    return { success: true };
}

export async function deleteBottleKeepComment(commentId: string) {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) throw new Error("No profile");

    // Verify user is the author
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

    // revalidatePath を削除 - コメントは loadComments() で手動更新するため
    return { success: true };
}

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
