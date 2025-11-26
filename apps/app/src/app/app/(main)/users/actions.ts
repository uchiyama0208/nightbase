"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createUser(formData: FormData) {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const displayName = formData.get("displayName") as string;
    const displayNameKana = (formData.get("displayNameKana") as string | null)?.trim() || null;
    const realName = formData.get("realName") as string;
    const realNameKana = formData.get("realNameKana") as string;
    const role = formData.get("role") as string;
    const guestAddressee = (formData.get("guestAddressee") as string | null)?.trim() || null;
    const guestReceiptTypeRaw = (formData.get("guestReceiptType") as string | null) ?? "none";
    const guestReceiptType = ["none", "amount_only", "with_date"].includes(guestReceiptTypeRaw)
        ? guestReceiptTypeRaw
        : "none";

    if (!displayName || !role) {
        throw new Error("必須項目が入力されていません");
    }

    // Get current user's store
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("店舗情報が見つかりません");
    }

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile?.store_id) {
        throw new Error("店舗情報が見つかりません");
    }

    // Create new profile
    // Note: user_id is omitted (null) for guests/staff created this way
    const { error } = await supabase.from("profiles").insert({
        display_name: displayName,
        display_name_kana: displayNameKana,
        real_name: realName,
        real_name_kana: realNameKana,
        role: role,
        store_id: currentProfile.store_id,
        user_id: null, // Explicitly set to null to avoid default value issues
        guest_addressee: role === "guest" ? guestAddressee : null,
        guest_receipt_type: role === "guest" ? guestReceiptType : "none",
    });

    if (error) {
        console.error("Error creating user:", error);
        throw new Error(`ユーザーの作成に失敗しました: ${error.message}`);
    }

    revalidatePath("/app/users");
    return { success: true };
}

export async function importUsersFromCsv(formData: FormData) {
    const file = formData.get("file") as File | null;
    if (!file) {
        throw new Error("CSVファイルが指定されていません");
    }

    const roleOverride = (formData.get("userRole") as string | null) ?? null;

    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("店舗情報が見つかりません");
    }

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile?.store_id) {
        throw new Error("店舗情報が見つかりません");
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);

    if (lines.length < 2) {
        throw new Error("CSVに有効なデータ行がありません");
    }

    const header = lines[0].split(",").map((h) => h.trim());
    const colIndex = {
        display_name: header.indexOf("display_name"),
        display_name_kana: header.indexOf("display_name_kana"),
        real_name: header.indexOf("real_name"),
        real_name_kana: header.indexOf("real_name_kana"),
        role: header.indexOf("role"),
    };

    if (colIndex.display_name === -1) {
        throw new Error("CSVヘッダーに display_name カラムが必要です");
    }
    if (colIndex.role === -1 && !roleOverride) {
        throw new Error("role カラムが存在しない場合は、インポートするロールを画面で選択してください");
    }

    const { data: existingProfiles } = await supabase
        .from("profiles")
        .select("display_name, display_name_kana")
        .eq("store_id", currentProfile.store_id);

    const existingNames = new Set(
        (existingProfiles || [])
            .map((p: any) => (p.display_name as string | null)?.trim().toLowerCase())
            .filter((name): name is string => !!name)
    );

    const toInsert: any[] = [];

    for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(",");
        const displayName = (columns[colIndex.display_name] || "").trim();
        const csvRole = colIndex.role !== -1 ? (columns[colIndex.role] || "").trim() : "";
        const role = roleOverride || csvRole;

        if (!displayName || !role) {
            continue;
        }

        const key = displayName.toLowerCase();
        if (existingNames.has(key)) {
            // 同じ display_name が既に存在する場合はスキップ
            continue;
        }

        const displayNameKana =
            colIndex.display_name_kana !== -1 ? (columns[colIndex.display_name_kana] || "").trim() : "";
        const realName = colIndex.real_name !== -1 ? (columns[colIndex.real_name] || "").trim() : "";
        const realNameKana = colIndex.real_name_kana !== -1 ? (columns[colIndex.real_name_kana] || "").trim() : "";

        toInsert.push({
            display_name: displayName,
            display_name_kana: displayNameKana || null,
            real_name: realName,
            real_name_kana: realNameKana,
            role,
            store_id: currentProfile.store_id,
            user_id: null,
        });

        existingNames.add(key);
    }

    if (toInsert.length === 0) {
        revalidatePath("/app/users");
        return;
    }

    const { error } = await supabase.from("profiles").insert(toInsert);

    if (error) {
        console.error("Error importing users from CSV:", error);
        throw new Error("CSVのインポート中にエラーが発生しました");
    }

    revalidatePath("/app/users");
}

export async function updateUser(formData: FormData) {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const profileId = formData.get("profileId") as string;
    const displayName = formData.get("displayName") as string;
    const displayNameKana = (formData.get("displayNameKana") as string | null)?.trim() || null;
    const realName = (formData.get("realName") as string | null) ?? "";
    const realNameKana = (formData.get("realNameKana") as string | null) ?? "";
    const role = formData.get("role") as string;
    const guestAddressee = (formData.get("guestAddressee") as string | null)?.trim() || null;
    const guestReceiptTypeRaw = (formData.get("guestReceiptType") as string | null) ?? "none";
    const guestReceiptType = ["none", "amount_only", "with_date"].includes(guestReceiptTypeRaw)
        ? guestReceiptTypeRaw
        : "none";

    if (!profileId || !displayName || !role) {
        throw new Error("必須項目が入力されていません");
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("店舗情報が見つかりません");
    }

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id, role, role_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile?.store_id) {
        throw new Error("店舗情報が見つかりません");
    }

    // Check if we are changing the role from Admin to something else
    if (currentProfile.role === "staff" && role !== "staff") {
        // Check if this is the last admin
        const { count, error: countError } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("store_id", currentProfile.store_id)
            .eq("role", "staff");

        if (countError) {
            console.error("Error checking admin count:", countError);
            throw new Error("管理者数の確認に失敗しました");
        }

        if (count !== null && count <= 1) {
            throw new Error("店舗には少なくとも1人のスタッフが必要です");
        }
    }

    // Also check for new role system (role_id)
    // If currentProfile has a role_id that corresponds to a system admin role
    if (currentProfile.role_id) {
        const { data: currentRole } = await supabase
            .from("store_roles")
            .select("name, is_system_role")
            .eq("id", currentProfile.role_id)
            .single();

        if (currentRole?.name === "スタッフ" && currentRole?.is_system_role) {
            // If we are changing the role (assuming role passed here is the string role, but we might need to handle role_id change too if UI supports it)
            // The current UI seems to pass 'role' string (admin/staff/cast/guest).
            // If the intention is to change the role, we need to be careful.
            // However, the current `updateUser` function updates the `role` column, not `role_id`.
            // We should probably update `role_id` as well based on the selected `role` string if we want to keep them in sync,
            // OR we need to update the UI to send `roleId`.
            // Given the current transition state, let's stick to the `role` column check for now as that's what the UI sends.
            // But wait, if I created a default Admin role, I should probably check that too.

            // Let's check if there are other users with the "管理者" role_id
            const { count: roleCount } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .eq("store_id", currentProfile.store_id)
                .eq("role_id", currentProfile.role_id);

            if (roleCount !== null && roleCount <= 1 && role !== "staff") {
                throw new Error("店舗には少なくとも1人のスタッフが必要です");
            }
        }
    }

    const { error } = await supabase
        .from("profiles")
        .update({
            display_name: displayName,
            display_name_kana: displayNameKana,
            real_name: realName,
            real_name_kana: realNameKana,
            role,
            guest_addressee: role === "guest" ? guestAddressee : null,
            guest_receipt_type: role === "guest" ? guestReceiptType : "none",
        })
        .eq("id", profileId)
        .eq("store_id", currentProfile.store_id);

    if (error) {
        console.error("Error updating user:", error);
        throw new Error(`ユーザーの更新に失敗しました: ${error.message}`);
    }

    revalidatePath("/app/users");
    return { success: true };
}

export async function deleteUser(profileId: string) {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    // Resolve current profile and store to ensure permission
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("No active profile found for current user");
    }

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile?.store_id) {
        throw new Error("店舗情報が見つかりません");
    }

    // Only admin or staff can delete users (adjust based on requirements, assuming staff/admin for now)
    // Ideally check if currentProfile.role is 'admin' or 'staff'

    // Verify the target profile belongs to the same store
    const { data: targetProfile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", profileId)
        .maybeSingle();

    if (!targetProfile) {
        throw new Error("ユーザーが見つかりません");
    }

    if (targetProfile.store_id !== currentProfile.store_id) {
        throw new Error("権限がありません");
    }

    // Delete the profile
    const { error } = await supabase.from("profiles").delete().eq("id", profileId);

    if (error) {
        console.error("Error deleting user:", error);
        throw new Error(`ユーザーの削除に失敗しました: ${error.message}`);
    }

    revalidatePath("/app/users");
    return { success: true };
}

export async function getProfileDetails(profileId: string) {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Get current user's profile ID
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    const currentProfileId = appUser?.current_profile_id;

    // Get relationships where profileId is source OR target
    const { data: relationships, error: relError } = await supabase
        .from("profile_relationships")
        .select("*")
        .or(`source_profile_id.eq.${profileId},target_profile_id.eq.${profileId}`);

    if (relError) {
        console.error("Error fetching relationships:", relError);
        return null;
    }

    // Get comments
    const { data: comments, error: comError } = await supabase
        .from("profile_comments")
        .select(`
            *,
            author:profiles!author_profile_id (
                id,
                display_name,
                avatar_url
            )
        `)
        .eq("target_profile_id", profileId)
        .order("updated_at", { ascending: false });

    if (comError) {
        console.error("Error fetching comments:", comError);
        return null;
    }

    if (!comments || comments.length === 0) {
        return {
            relationships: relationships || [],
            comments: [],
        };
    }

    // Get all comment IDs
    const commentIds = comments.map((c) => c.id);

    // Fetch all likes for these comments in one query
    const { data: allLikes } = await supabase
        .from("profile_comment_likes")
        .select("comment_id, profile_id")
        .in("comment_id", commentIds);

    // Create a map of comment_id -> like count and user's like status
    const likesMap = new Map<string, { count: number; userHasLiked: boolean }>();

    commentIds.forEach((id) => {
        const commentLikes = allLikes?.filter((like) => like.comment_id === id) || [];
        likesMap.set(id, {
            count: commentLikes.length,
            userHasLiked: commentLikes.some((like) => like.profile_id === currentProfileId),
        });
    });

    // Add like data to comments
    const commentsWithLikes = comments.map((comment) => {
        const likeData = likesMap.get(comment.id) || { count: 0, userHasLiked: false };
        return {
            ...comment,
            like_count: likeData.count,
            user_has_liked: likeData.userHasLiked,
        };
    });

    return {
        relationships: relationships || [],
        comments: commentsWithLikes,
    };
}

export async function updateProfileRelationships(
    profileId: string,
    type: string,
    targetProfileIds: string[]
) {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Get current user's store
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

    // 1. Fetch existing relationships of this type for this profile
    const { data: existing, error: fetchError } = await supabase
        .from("profile_relationships")
        .select("*")
        .eq("relationship_type", type)
        .or(`source_profile_id.eq.${profileId},target_profile_id.eq.${profileId}`);

    if (fetchError) throw new Error(fetchError.message);

    const existingIds = new Set(
        existing?.map((r) =>
            r.source_profile_id === profileId ? r.target_profile_id : r.source_profile_id
        )
    );

    const newIds = new Set(targetProfileIds);

    // 2. Determine additions and removals
    const toAdd = targetProfileIds.filter((id) => !existingIds.has(id));
    const toRemove = Array.from(existingIds).filter((id) => !newIds.has(id));

    // 3. Remove
    if (toRemove.length > 0) {
        // We need to delete where (source=profileId AND target IN toRemove) OR (target=profileId AND source IN toRemove)
        // AND type = type
        // Since we can't do complex ORs in delete easily with array, we iterate or do two queries.
        // Simpler: Delete by ID if we had them, but we fetched them.
        const idsToDelete = existing
            ?.filter(
                (r) =>
                    toRemove.includes(r.source_profile_id === profileId ? r.target_profile_id : r.source_profile_id)
            )
            .map((r) => r.id);

        if (idsToDelete && idsToDelete.length > 0) {
            const { error: delError } = await supabase
                .from("profile_relationships")
                .delete()
                .in("id", idsToDelete);
            if (delError) throw new Error(delError.message);
        }
    }

    // 4. Add
    if (toAdd.length > 0) {
        const toInsert = toAdd.map((targetId) => {
            // Ensure source < target
            const [source, target] = [profileId, targetId].sort();
            return {
                store_id: currentProfile.store_id,
                source_profile_id: source,
                target_profile_id: target,
                relationship_type: type,
            };
        });

        const { error: insError } = await supabase.from("profile_relationships").insert(toInsert);
        if (insError) throw new Error(insError.message);
    }

    revalidatePath("/app/users");
    return { success: true };
}

export async function addProfileComment(targetProfileId: string, content: string) {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

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

    const { error } = await supabase.from("profile_comments").insert({
        store_id: currentProfile.store_id,
        target_profile_id: targetProfileId,
        author_profile_id: appUser.current_profile_id,
        content: content,
    });

    if (error) throw new Error(error.message);

    revalidatePath("/app/users");
    return { success: true };
}

export async function getAllProfiles() {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) return [];

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile?.store_id) return [];

    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, real_name, role, avatar_url")
        .eq("store_id", currentProfile.store_id)
        .order("display_name");

    return profiles || [];
}

export async function getCurrentUserProfileId() {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    return appUser?.current_profile_id || null;
}

export async function updateProfileComment(commentId: string, content: string) {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) throw new Error("No profile");

    // Verify user is the author
    const { data: comment } = await supabase
        .from("profile_comments")
        .select("author_profile_id")
        .eq("id", commentId)
        .maybeSingle();

    if (!comment || comment.author_profile_id !== appUser.current_profile_id) {
        throw new Error("Unauthorized");
    }

    const { error } = await supabase
        .from("profile_comments")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", commentId);

    if (error) throw new Error(error.message);

    revalidatePath("/app/users");
    return { success: true };
}

export async function deleteProfileComment(commentId: string) {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) throw new Error("No profile");

    // Verify user is the author
    const { data: comment } = await supabase
        .from("profile_comments")
        .select("author_profile_id")
        .eq("id", commentId)
        .maybeSingle();

    if (!comment || comment.author_profile_id !== appUser.current_profile_id) {
        throw new Error("Unauthorized");
    }

    const { error } = await supabase
        .from("profile_comments")
        .delete()
        .eq("id", commentId);

    if (error) throw new Error(error.message);

    revalidatePath("/app/users");
    return { success: true };
}

export async function toggleCommentLike(commentId: string) {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) throw new Error("No profile");

    // Check if already liked
    const { data: existingLike } = await supabase
        .from("profile_comment_likes")
        .select("id")
        .eq("comment_id", commentId)
        .eq("profile_id", appUser.current_profile_id)
        .maybeSingle();

    if (existingLike) {
        // Unlike
        const { error } = await supabase
            .from("profile_comment_likes")
            .delete()
            .eq("id", existingLike.id);

        if (error) throw new Error(error.message);
    } else {
        // Like
        const { error } = await supabase
            .from("profile_comment_likes")
            .insert({
                comment_id: commentId,
                profile_id: appUser.current_profile_id,
            });

        if (error) throw new Error(error.message);
    }

    revalidatePath("/app/users");
    return { success: true };
}

export async function getUsersData(roleParam?: string, query?: string) {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { redirect: "/login" };
    }

    const role = roleParam || "cast";

    // Resolve current profile via users.current_profile_id
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return { redirect: "/app/me" };
    }

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("id, store_id, role, stores(*)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile || !currentProfile.store_id) {
        return { redirect: "/app/me" };
    }

    // Role check
    if (currentProfile.role !== "staff") {
        return { redirect: "/app/timecard" };
    }

    let queryBuilder = supabase
        .from("profiles")
        .select("id, display_name, display_name_kana, real_name, real_name_kana, role, avatar_url, guest_addressee, guest_receipt_type")
        .eq("store_id", currentProfile.store_id)
        .eq("role", role)
        .order("display_name");

    if (query) {
        queryBuilder = queryBuilder.or(`display_name.ilike.%${query}%,display_name_kana.ilike.%${query}%,real_name.ilike.%${query}%,real_name_kana.ilike.%${query}%`);
    }

    const { data: users, error } = await queryBuilder;

    if (error) {
        console.error("Error fetching users:", error);
        return { data: { users: [] } };
    }

    return {
        data: {
            users: users || [],
        }
    };
}

export async function getUserBottleKeeps(profileId: string) {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) return [];

    // Check permission (same store)
    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile?.store_id) return [];

    const { data: targetProfile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", profileId)
        .maybeSingle();

    if (!targetProfile || targetProfile.store_id !== currentProfile.store_id) {
        return [];
    }

    // Fetch bottle keeps via bottle_keep_holders
    const { data: holders, error } = await supabase
        .from("bottle_keep_holders")
        .select(`
            bottle_keep_id,
            bottle_keeps (
                id,
                menu_id,
                opened_at,
                expiration_date,
                remaining_amount,
                status,
                memo,
                menus (
                    name,
                    price
                )
            )
        `)
        .eq("profile_id", profileId);

    if (error) {
        console.error("Error fetching user bottle keeps:", error);
        return [];
    }

    // Flatten the structure
    const bottleKeeps = holders
        ?.map((h: any) => h.bottle_keeps)
        .filter((b: any) => b && b.status === "active") // Only active bottles
        .map((b: any) => ({
            ...b,
            menu_name: b.menus?.name || "不明なボトル",
            menu_price: b.menus?.price || 0,
        }));

    return bottleKeeps || [];
}

export async function uploadProfileAvatar(profileId: string, formData: FormData) {
    const supabase = await createServerClient();
    const file = formData.get("file") as File;

    if (!file) {
        throw new Error("ファイルが選択されていません");
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${profileId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

    if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`アップロードに失敗しました: ${uploadError.message}`);
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

    // Update profile
    const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profileId);

    if (updateError) {
        console.error("Update error:", updateError);
        throw new Error(`プロフィールの更新に失敗しました: ${updateError.message}`);
    }

    revalidatePath("/app/users");
    return { success: true, publicUrl };
}

export async function deleteProfileAvatar(profileId: string) {
    const supabase = await createServerClient();

    // Get current avatar url to delete file (optional, but good practice)
    const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", profileId)
        .single();

    if (profile?.avatar_url) {
        const url = new URL(profile.avatar_url);
        const path = url.pathname.split('/').pop(); // Simple extraction, might need adjustment based on URL structure
        if (path) {
            await supabase.storage.from('avatars').remove([path]);
        }
    }

    // Update profile to remove avatar_url
    const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", profileId);

    if (error) {
        throw new Error(`削除に失敗しました: ${error.message}`);
    }

    revalidatePath("/app/users");
    return { success: true };
}

