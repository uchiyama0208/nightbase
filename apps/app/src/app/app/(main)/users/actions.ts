"use server";

import { revalidatePath } from "next/cache";
import { getAuthContextWithPermission } from "@/lib/auth";
import { createServerClient } from "@/lib/supabaseServerClient";

export async function createUser(formData: FormData): Promise<{ success: boolean; error?: string }> {
    try {
        // Check edit permission for users page
        const { supabase, profile: currentProfile } = await getAuthContextWithPermission("users", "edit");

        if (!currentProfile?.store_id) {
            return { success: false, error: "店舗情報が見つかりません" };
        }

    const displayName = formData.get("displayName") as string;
    const displayNameKana = (formData.get("displayNameKana") as string | null)?.trim() || null;
    const lastName = (formData.get("lastName") as string | null)?.trim() || null;
    const firstName = (formData.get("firstName") as string | null)?.trim() || null;
    const lastNameKana = (formData.get("lastNameKana") as string | null)?.trim() || null;
    const firstNameKana = (formData.get("firstNameKana") as string | null)?.trim() || null;
    // Legacy support: construct real_name from last/first if not provided directly (though UI will likely send split)
    // or just store them. The migration added columns, so we should store them.
    // We can also populate real_name for backward compatibility if we want, but the plan said "Split".
    // Let's populate real_name as a combination for now to be safe with existing code that reads it.
    const realName = (formData.get("realName") as string | null)?.trim() || [lastName, firstName].filter(Boolean).join(" ");
    const realNameKana = (formData.get("realNameKana") as string | null)?.trim() || [lastNameKana, firstNameKana].filter(Boolean).join(" ");

    const zipCode = (formData.get("zipCode") as string | null)?.trim() || null;
    const prefecture = (formData.get("prefecture") as string | null)?.trim() || null;
    const city = (formData.get("city") as string | null)?.trim() || null;
    const street = (formData.get("street") as string | null)?.trim() || null;
    const building = (formData.get("building") as string | null)?.trim() || null;
    const birthDate = (formData.get("birthDate") as string | null)?.trim() || null;
    const phoneNumber = (formData.get("phoneNumber") as string | null)?.trim() || null;
    const emergencyPhoneNumber = (formData.get("emergencyPhoneNumber") as string | null)?.trim() || null;
    const nearestStation = (formData.get("nearestStation") as string | null)?.trim() || null;

    // Cast specific fields
    const height = (formData.get("height") as string | null)?.trim() ? parseInt(formData.get("height") as string) : null;
    const desiredCastName = (formData.get("desiredCastName") as string | null)?.trim() || null;
    const desiredHourlyWage = (formData.get("desiredHourlyWage") as string | null)?.trim() ? parseInt(formData.get("desiredHourlyWage") as string) : null;
    const desiredShiftDays = (formData.get("desiredShiftDays") as string | null)?.trim() || null;

    const role = formData.get("role") as string;
    const guestAddressee = (formData.get("guestAddressee") as string | null)?.trim() || null;
    const guestReceiptTypeRaw = (formData.get("guestReceiptType") as string | null) ?? "none";
    const guestReceiptType = ["none", "amount_only", "with_date"].includes(guestReceiptTypeRaw)
        ? guestReceiptTypeRaw
        : "none";

        if (!displayName || !role) {
            return { success: false, error: "必須項目が入力されていません" };
        }

        // Create new profile
        // Note: user_id is omitted (null) for guests/staff created this way
        const { error } = await supabase.from("profiles").insert({
            display_name: displayName,
            display_name_kana: displayNameKana,
            real_name: realName,
            real_name_kana: realNameKana,
            last_name: lastName,
            first_name: firstName,
            last_name_kana: lastNameKana,
            first_name_kana: firstNameKana,
            zip_code: zipCode,
            prefecture: prefecture,
            city: city,
            street: street,
            building: building,
            birth_date: birthDate,
            phone_number: phoneNumber,
            emergency_phone_number: emergencyPhoneNumber,
            nearest_station: nearestStation,
            height: height,
            desired_cast_name: desiredCastName,
            desired_hourly_wage: desiredHourlyWage,
            desired_shift_days: desiredShiftDays,
            status: role === "cast" ? (formData.get("status") as string || "通常") : null,
            role: role,
            store_id: currentProfile.store_id,
            user_id: null, // Explicitly set to null to avoid default value issues
            guest_addressee: role === "guest" ? guestAddressee : null,
            guest_receipt_type: role === "guest" ? guestReceiptType : "none",
        });

        if (error) {
            console.error("Error creating user:", error);
            return { success: false, error: `ユーザーの作成に失敗しました: ${error.message}` };
        }

        revalidatePath("/app/users");
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || "ユーザーの作成に失敗しました" };
    }
}

export interface UserImportResult {
    success: boolean;
    imported: number;
    skipped: number;
    duplicates: number;
    errors: { row: number; field: string; message: string }[];
}

export async function importUsersFromCsv(formData: FormData): Promise<UserImportResult> {
    const file = formData.get("file") as File | null;
    if (!file) {
        return { success: false, imported: 0, skipped: 0, duplicates: 0, errors: [{ row: 0, field: "", message: "CSVファイルが指定されていません" }] };
    }

    const roleOverride = (formData.get("userRole") as string | null) ?? null;
    const mappingsJson = formData.get("mappings") as string | null;

    // 権限チェック
    const { supabase, profile: currentProfile } = await getAuthContextWithPermission("users", "edit");

    if (!currentProfile?.store_id) {
        return { success: false, imported: 0, skipped: 0, duplicates: 0, errors: [{ row: 0, field: "", message: "店舗情報が見つかりません" }] };
    }

    const text = await file.text();
    // Remove BOM if present
    const cleanText = text.replace(/^\uFEFF/, "");
    const lines = cleanText.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);

    if (lines.length < 2) {
        return { success: false, imported: 0, skipped: 0, duplicates: 0, errors: [{ row: 0, field: "", message: "CSVに有効なデータ行がありません" }] };
    }

    const header = lines[0].split(",").map((h) => h.trim());

    // Use mappings if provided, otherwise fall back to direct column names
    let colIndex: Record<string, number>;
    if (mappingsJson) {
        const mappings = JSON.parse(mappingsJson) as Record<string, string>;
        colIndex = {
            display_name: mappings.display_name ? header.indexOf(mappings.display_name) : -1,
            display_name_kana: mappings.display_name_kana ? header.indexOf(mappings.display_name_kana) : -1,
            real_name: mappings.real_name ? header.indexOf(mappings.real_name) : -1,
            real_name_kana: mappings.real_name_kana ? header.indexOf(mappings.real_name_kana) : -1,
            role: mappings.role ? header.indexOf(mappings.role) : -1,
        };
    } else {
        colIndex = {
            display_name: header.indexOf("display_name"),
            display_name_kana: header.indexOf("display_name_kana"),
            real_name: header.indexOf("real_name"),
            real_name_kana: header.indexOf("real_name_kana"),
            role: header.indexOf("role"),
        };
    }

    if (colIndex.display_name === -1) {
        return { success: false, imported: 0, skipped: 0, duplicates: 0, errors: [{ row: 0, field: "display_name", message: "表示名の列がマッピングされていません" }] };
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
    const errors: { row: number; field: string; message: string }[] = [];
    let skipped = 0;
    let duplicates = 0;

    for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(",");
        const displayName = (columns[colIndex.display_name] || "").trim();
        const csvRole = colIndex.role !== -1 ? (columns[colIndex.role] || "").trim() : "";
        const role = roleOverride || csvRole;

        if (!displayName) {
            skipped++;
            errors.push({ row: i + 1, field: "display_name", message: "表示名が空です" });
            continue;
        }

        if (!role) {
            skipped++;
            errors.push({ row: i + 1, field: "role", message: "ロールが指定されていません" });
            continue;
        }

        const key = displayName.toLowerCase();
        if (existingNames.has(key)) {
            duplicates++;
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
        return { success: true, imported: 0, skipped, duplicates, errors };
    }

    const { error } = await supabase.from("profiles").insert(toInsert);

    if (error) {
        console.error("Error importing users from CSV:", error);
        return { success: false, imported: 0, skipped, duplicates, errors: [{ row: 0, field: "", message: "CSVのインポート中にエラーが発生しました" }] };
    }

    revalidatePath("/app/users");
    return { success: true, imported: toInsert.length, skipped, duplicates, errors };
}

export async function updateUser(formData: FormData): Promise<{ success: boolean; error?: string }> {
    try {
        // Check edit permission for users page
        const { supabase, user } = await getAuthContextWithPermission("users", "edit");

        const profileId = formData.get("profileId") as string;
        const displayName = formData.get("displayName") as string;
        const displayNameKana = (formData.get("displayNameKana") as string | null)?.trim() || null;

        const lastName = (formData.get("lastName") as string | null)?.trim() || null;
        const firstName = (formData.get("firstName") as string | null)?.trim() || null;
        const lastNameKana = (formData.get("lastNameKana") as string | null)?.trim() || null;
        const firstNameKana = (formData.get("firstNameKana") as string | null)?.trim() || null;

        const realName = (formData.get("realName") as string | null)?.trim() || [lastName, firstName].filter(Boolean).join(" ");
        const realNameKana = (formData.get("realNameKana") as string | null)?.trim() || [lastNameKana, firstNameKana].filter(Boolean).join(" ");

        const zipCode = (formData.get("zipCode") as string | null)?.trim() || null;
        const prefecture = (formData.get("prefecture") as string | null)?.trim() || null;
        const city = (formData.get("city") as string | null)?.trim() || null;
        const street = (formData.get("street") as string | null)?.trim() || null;
        const building = (formData.get("building") as string | null)?.trim() || null;
        const birthDate = (formData.get("birthDate") as string | null)?.trim() || null;
        const phoneNumber = (formData.get("phoneNumber") as string | null)?.trim() || null;

        const emergencyPhoneNumber = (formData.get("emergencyPhoneNumber") as string | null)?.trim() || null;
        const nearestStation = (formData.get("nearestStation") as string | null)?.trim() || null;
        const height = (formData.get("height") as string | null)?.trim() ? parseInt(formData.get("height") as string) : null;

        const desiredCastName = (formData.get("desiredCastName") as string | null)?.trim() || null;
        const desiredHourlyWage = (formData.get("desiredHourlyWage") as string | null)?.trim() ? parseInt(formData.get("desiredHourlyWage") as string) : null;
        const desiredShiftDays = (formData.get("desiredShiftDays") as string | null)?.trim() || null;

        const role = formData.get("role") as string;
        const guestAddressee = (formData.get("guestAddressee") as string | null)?.trim() || null;
        const guestReceiptTypeRaw = (formData.get("guestReceiptType") as string | null) ?? "none";
        const guestReceiptType = ["none", "amount_only", "with_date"].includes(guestReceiptTypeRaw)
            ? guestReceiptTypeRaw
            : "none";

        if (!profileId || !displayName || !role) {
            return { success: false, error: "必須項目が入力されていません" };
        }

        const { data: appUser } = await supabase
            .from("users")
            .select("current_profile_id")
            .eq("id", user.id)
            .maybeSingle();

        if (!appUser?.current_profile_id) {
            return { success: false, error: "店舗情報が見つかりません" };
        }

        const { data: currentProfile } = await supabase
            .from("profiles")
            .select("store_id, role, role_id")
            .eq("id", appUser.current_profile_id)
            .maybeSingle();

        if (!currentProfile?.store_id) {
            return { success: false, error: "店舗情報が見つかりません" };
        }

        // Get the target profile's current role
        const { data: targetProfile } = await supabase
            .from("profiles")
            .select("role, role_id")
            .eq("id", profileId)
            .maybeSingle();

        // Check if we are changing the role from staff to something else
        if (targetProfile?.role === "staff" && role !== "staff") {
            // Check if this is the last staff
            const { count, error: countError } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .eq("store_id", currentProfile.store_id)
                .eq("role", "staff");

            if (countError) {
                console.error("Error checking staff count:", countError);
                return { success: false, error: "スタッフ数の確認に失敗しました" };
            }

            if (count !== null && count <= 1) {
                return { success: false, error: "店舗には少なくとも1人のスタッフが必要です" };
            }
        }

        // Also check for new role system (role_id) on the target profile
        if (targetProfile?.role_id) {
            const { data: targetRole } = await supabase
                .from("store_roles")
                .select("name, is_system_role")
                .eq("id", targetProfile.role_id)
                .single();

            if (targetRole?.name === "デフォルトスタッフ" && targetRole?.is_system_role && role !== "staff") {
                // Check if there are other users with the same staff role_id
                const { count: roleCount } = await supabase
                    .from("profiles")
                    .select("*", { count: "exact", head: true })
                    .eq("store_id", currentProfile.store_id)
                    .eq("role_id", targetProfile.role_id);

                if (roleCount !== null && roleCount <= 1) {
                    return { success: false, error: "店舗には少なくとも1人のスタッフが必要です" };
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
                last_name: lastName,
                first_name: firstName,
                last_name_kana: lastNameKana,
                first_name_kana: firstNameKana,
                zip_code: zipCode,
                prefecture: prefecture,
                city: city,
                street: street,
                building: building,
                birth_date: birthDate,
                phone_number: phoneNumber,
                emergency_phone_number: emergencyPhoneNumber,
                nearest_station: nearestStation,
                height: height,
                desired_cast_name: desiredCastName,
                desired_hourly_wage: desiredHourlyWage,
                desired_shift_days: desiredShiftDays,
                status: role === "cast" ? (formData.get("status") as string || "通常") : null,
                role,
                guest_addressee: role === "guest" ? guestAddressee : null,
                guest_receipt_type: role === "guest" ? guestReceiptType : "none",
            })
            .eq("id", profileId)
            .eq("store_id", currentProfile.store_id);

        if (error) {
            console.error("Error updating user:", error);
            return { success: false, error: `ユーザーの更新に失敗しました: ${error.message}` };
        }

        revalidatePath("/app/users");
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || "ユーザーの更新に失敗しました" };
    }
}

// Auto-save version that doesn't call revalidatePath to prevent modal from closing
export async function autoSaveUser(formData: FormData) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const profileId = formData.get("profileId") as string;
    if (!profileId) return { success: false };

    const displayName = formData.get("displayName") as string;
    const displayNameKana = (formData.get("displayNameKana") as string | null)?.trim() || null;

    const lastName = (formData.get("lastName") as string | null)?.trim() || null;
    const firstName = (formData.get("firstName") as string | null)?.trim() || null;
    const lastNameKana = (formData.get("lastNameKana") as string | null)?.trim() || null;
    const firstNameKana = (formData.get("firstNameKana") as string | null)?.trim() || null;

    const realName = (formData.get("realName") as string | null)?.trim() || [lastName, firstName].filter(Boolean).join(" ");
    const realNameKana = (formData.get("realNameKana") as string | null)?.trim() || [lastNameKana, firstNameKana].filter(Boolean).join(" ");

    const zipCode = (formData.get("zipCode") as string | null)?.trim() || null;
    const prefecture = (formData.get("prefecture") as string | null)?.trim() || null;
    const city = (formData.get("city") as string | null)?.trim() || null;
    const street = (formData.get("street") as string | null)?.trim() || null;
    const building = (formData.get("building") as string | null)?.trim() || null;
    const birthDate = (formData.get("birthDate") as string | null)?.trim() || null;
    const phoneNumber = (formData.get("phoneNumber") as string | null)?.trim() || null;

    const emergencyPhoneNumber = (formData.get("emergencyPhoneNumber") as string | null)?.trim() || null;
    const nearestStation = (formData.get("nearestStation") as string | null)?.trim() || null;
    const height = (formData.get("height") as string | null)?.trim() ? parseInt(formData.get("height") as string) : null;

    const desiredCastName = (formData.get("desiredCastName") as string | null)?.trim() || null;
    const desiredHourlyWage = (formData.get("desiredHourlyWage") as string | null)?.trim() ? parseInt(formData.get("desiredHourlyWage") as string) : null;
    const desiredShiftDays = (formData.get("desiredShiftDays") as string | null)?.trim() || null;

    const role = formData.get("role") as string;
    const guestAddressee = (formData.get("guestAddressee") as string | null)?.trim() || null;
    const guestReceiptTypeRaw = (formData.get("guestReceiptType") as string | null) ?? "none";
    const guestReceiptType = ["none", "amount_only", "with_date"].includes(guestReceiptTypeRaw)
        ? guestReceiptTypeRaw
        : "none";

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return { success: false };
    }

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile?.store_id) {
        return { success: false };
    }

    const { error } = await supabase
        .from("profiles")
        .update({
            display_name: displayName,
            display_name_kana: displayNameKana,
            real_name: realName,
            real_name_kana: realNameKana,
            last_name: lastName,
            first_name: firstName,
            last_name_kana: lastNameKana,
            first_name_kana: firstNameKana,
            zip_code: zipCode,
            prefecture: prefecture,
            city: city,
            street: street,
            building: building,
            birth_date: birthDate,
            phone_number: phoneNumber,
            emergency_phone_number: emergencyPhoneNumber,
            nearest_station: nearestStation,
            height: height,
            desired_cast_name: desiredCastName,
            desired_hourly_wage: desiredHourlyWage,
            desired_shift_days: desiredShiftDays,
            status: role === "cast" ? (formData.get("status") as string || "通常") : null,
            role,
            guest_addressee: role === "guest" ? guestAddressee : null,
            guest_receipt_type: role === "guest" ? guestReceiptType : "none",
        })
        .eq("id", profileId)
        .eq("store_id", currentProfile.store_id);

    if (error) {
        console.error("Error auto-saving user:", error);
        return { success: false };
    }

    // No revalidatePath here to prevent modal from closing
    return { success: true };
}

export async function deleteUser(profileId: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Check edit permission for users page
        const { supabase, profile: currentProfile } = await getAuthContextWithPermission("users", "edit");

        if (!currentProfile?.store_id) {
            return { success: false, error: "店舗情報が見つかりません" };
        }

        // Get target profile
        const { data: targetProfile } = await supabase
            .from("profiles")
            .select("store_id, user_id")
            .eq("id", profileId)
            .maybeSingle();

        if (!targetProfile) {
            return { success: false, error: "ユーザーが見つかりません" };
        }

        // Verify same store
        if (targetProfile.store_id !== currentProfile.store_id) {
            return { success: false, error: "権限がありません" };
        }

        // Prevent self-deletion
        if (profileId === currentProfile.id) {
            return { success: false, error: "自分自身を削除することはできません" };
        }

        // Find all users who have this profile as current_profile_id
        const { data: affectedUsers } = await supabase
            .from("users")
            .select("id")
            .eq("current_profile_id", profileId);

        // Update affected users' current_profile_id to null
        if (affectedUsers && affectedUsers.length > 0) {
            const { error: updateError } = await supabase
                .from("users")
                .update({ current_profile_id: null })
                .eq("current_profile_id", profileId);

            if (updateError) {
                console.error("Error updating affected users:", updateError);
                return { success: false, error: "関連ユーザーの更新に失敗しました" };
            }
        }

        // Delete the profile (CASCADE DELETE will handle related data)
        const { error } = await supabase.from("profiles").delete().eq("id", profileId);

        if (error) {
            console.error("Error deleting user:", error);
            return { success: false, error: `ユーザーの削除に失敗しました: ${error.message}` };
        }

        revalidatePath("/app/users");
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || "ユーザーの削除に失敗しました" };
    }
}

export async function getProfileDetails(profileId: string) {
    const supabase = await createServerClient() as any;
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
        .from("comments")
        .select(`
            *,
            author:profiles!comments_author_profile_id_fkey (
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
        .from("comment_likes")
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
    const supabase = await createServerClient() as any;
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

    const existingIds = new Set<string>(
        existing?.map((r: any) =>
            r.source_profile_id === profileId ? r.target_profile_id : r.source_profile_id
        )
    );

    const newIds = new Set<string>(targetProfileIds);

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

    // revalidatePath("/app/users");
    return { success: true };
}

export async function addProfileComment(targetProfileId: string, content: string) {
    const supabase = await createServerClient() as any;
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

    const { data, error } = await supabase.from("comments").insert({
        store_id: currentProfile.store_id,
        target_profile_id: targetProfileId,
        author_profile_id: appUser.current_profile_id,
        content: content,
    }).select();

    if (error) {
        console.error("Comment insert error:", error);
        throw new Error(error.message);
    }

    revalidatePath("/app/users");
    return { success: true };
}

export async function getAllProfiles() {
    const supabase = await createServerClient() as any;
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
        .select("id, display_name, real_name, role, avatar_url, user_id")
        .eq("store_id", currentProfile.store_id)
        .order("display_name");

    // Filter out temp guests (display_name matches "ゲスト\d+" pattern and user_id is null)
    const filteredProfiles = (profiles || []).filter(profile => {
        // Exclude temp guests
        if (profile.user_id === null && profile.display_name?.match(/^ゲスト\d+$/)) {
            return false;
        }
        return true;
    });

    return filteredProfiles;
}

export async function getCurrentUserProfileId() {
    const supabase = await createServerClient() as any;
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

// Combined fetch for user edit modal - single server action to reduce round trips
export async function getUserEditModalData(targetProfileId: string | null, targetRole: string | null) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) return null;

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile?.store_id) return null;

    // Fetch all profiles for relationship selection
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, real_name, role, avatar_url, user_id")
        .eq("store_id", currentProfile.store_id)
        .order("display_name");

    const filteredProfiles = (profiles || []).filter(profile => {
        if (profile.user_id === null && profile.display_name?.match(/^ゲスト\d+$/)) {
            return false;
        }
        return true;
    });

    // If no target profile, return just the basics
    if (!targetProfileId) {
        // Still need to fetch salary systems for new profile creation
        let salarySystems: any[] = [];
        if (targetRole === "cast" || targetRole === "staff" || targetRole === "partner") {
            const salaryTargetType = targetRole === "cast" ? "cast" : "staff";
            const { data: systems } = await supabase
                .from("salary_systems")
                .select("id, name, target_type")
                .eq("store_id", currentProfile.store_id)
                .eq("target_type", salaryTargetType)
                .order("name");
            salarySystems = systems || [];
        }

        return {
            currentUserProfileId: appUser.current_profile_id,
            allProfiles: filteredProfiles,
            relationships: [],
            comments: [],
            bottleKeeps: [],
            pastEmployments: [],
            salarySystems,
            assignedSalarySystemIds: [],
        };
    }

    // Fetch profile details (relationships and comments)
    const [relationshipsResult, commentsResult] = await Promise.all([
        supabase
            .from("profile_relationships")
            .select("*")
            .or(`source_profile_id.eq.${targetProfileId},target_profile_id.eq.${targetProfileId}`),
        supabase
            .from("comments")
            .select(`
                *,
                author:profiles!comments_author_profile_id_fkey (
                    id,
                    display_name,
                    avatar_url
                )
            `)
            .eq("target_profile_id", targetProfileId)
            .order("updated_at", { ascending: false })
    ]);

    let bottleKeeps: any[] = [];
    let pastEmployments: any[] = [];

    // Fetch role-specific data
    if (targetRole === "guest") {
        const { data: holders } = await supabase
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
            .eq("profile_id", targetProfileId);

        bottleKeeps = (holders || [])
            .map((h: any) => h.bottle_keeps)
            .filter((b: any) => b && b.status === "active")
            .map((b: any) => ({
                ...b,
                menu_name: b.menus?.name || "不明なボトル",
                menu_price: b.menus?.price || 0,
            }));
    } else if (targetRole === "cast") {
        const { data } = await supabase
            .from("past_employments")
            .select("*")
            .eq("profile_id", targetProfileId)
            .order("created_at", { ascending: false });
        pastEmployments = data || [];
    }

    // Fetch salary systems for cast, staff, partner
    let salarySystems: any[] = [];
    let assignedSalarySystemIds: string[] = [];

    if (targetRole === "cast" || targetRole === "staff" || targetRole === "partner") {
        // Get all salary systems for this store matching the target type
        const salaryTargetType = targetRole === "cast" ? "cast" : "staff";
        const { data: systems } = await supabase
            .from("salary_systems")
            .select("id, name, target_type")
            .eq("store_id", currentProfile.store_id)
            .eq("target_type", salaryTargetType)
            .order("name");
        salarySystems = systems || [];

        // Get assigned salary systems for this profile
        if (targetProfileId) {
            const { data: assigned } = await supabase
                .from("profile_salary_systems")
                .select("salary_system_id")
                .eq("profile_id", targetProfileId);
            assignedSalarySystemIds = (assigned || []).map((a: any) => a.salary_system_id);
        }
    }

    // Add like counts to comments
    const comments = commentsResult.data || [];
    let commentsWithLikes = comments;

    if (comments.length > 0) {
        const commentIds = comments.map((c) => c.id);
        const { data: allLikes } = await supabase
            .from("comment_likes")
            .select("comment_id, profile_id")
            .in("comment_id", commentIds);

        const likesMap = new Map<string, { count: number; userHasLiked: boolean }>();
        commentIds.forEach((id) => {
            const commentLikes = allLikes?.filter((like) => like.comment_id === id) || [];
            likesMap.set(id, {
                count: commentLikes.length,
                userHasLiked: commentLikes.some((like) => like.profile_id === appUser.current_profile_id),
            });
        });

        commentsWithLikes = comments.map((comment) => {
            const likeData = likesMap.get(comment.id) || { count: 0, userHasLiked: false };
            return {
                ...comment,
                like_count: likeData.count,
                user_has_liked: likeData.userHasLiked,
            };
        });
    }

    return {
        currentUserProfileId: appUser.current_profile_id,
        allProfiles: filteredProfiles,
        relationships: relationshipsResult.data || [],
        comments: commentsWithLikes,
        bottleKeeps,
        pastEmployments,
        salarySystems,
        assignedSalarySystemIds,
    };
}

export async function updateProfileComment(commentId: string, content: string) {
    const supabase = await createServerClient() as any;
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

    revalidatePath("/app/users");
    return { success: true };
}

export async function deleteProfileComment(commentId: string) {
    const supabase = await createServerClient() as any;
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

    revalidatePath("/app/users");
    return { success: true };
}

export async function toggleCommentLike(commentId: string) {
    const supabase = await createServerClient() as any;
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
        .from("comment_likes")
        .select("id")
        .eq("comment_id", commentId)
        .eq("profile_id", appUser.current_profile_id)
        .maybeSingle();

    if (existingLike) {
        // Unlike
        const { error } = await supabase
            .from("comment_likes")
            .delete()
            .eq("id", existingLike.id);

        if (error) throw new Error(error.message);
    } else {
        // Like
        const { error } = await supabase
            .from("comment_likes")
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
    const supabase = await createServerClient() as any;
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

    // Role check - staff and admin can access
    if (currentProfile.role !== "staff" && currentProfile.role !== "admin") {
        return { redirect: "/app/timecard" };
    }

    let queryBuilder = supabase
        .from("profiles")
        .select("id, display_name, display_name_kana, real_name, real_name_kana, role, avatar_url, guest_addressee, guest_receipt_type, user_id")
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

    // Filter out temp guests (display_name matches "ゲスト\d+" pattern and user_id is null)
    const filteredUsers = (users || []).filter((user: any) => {
        // Exclude temp guests
        if (user.user_id === null && user.display_name?.match(/^ゲスト\d+$/)) {
            return false;
        }
        return true;
    });

    return {
        data: {
            users: filteredUsers || [],
        }
    };
}

export async function getUserBottleKeeps(profileId: string) {
    const supabase = await createServerClient() as any;
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
    const supabase = await createServerClient() as any;
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
    const supabase = await createServerClient() as any;

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

// Past Employment Management
export async function getPastEmployments(profileId: string) {
    const supabase = await createServerClient() as any;
    const { data, error } = await supabase
        .from("past_employments")
        .select("*")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching past employments:", error);
        return [];
    }

    return data;
}

export async function createPastEmployment(formData: FormData) {
    const supabase = await createServerClient() as any;

    const profileId = formData.get("profileId") as string;
    const storeName = formData.get("storeName") as string;
    const period = formData.get("period") as string;
    const hourlyWage = formData.get("hourlyWage") as string;
    const salesAmount = formData.get("salesAmount") as string;
    const customerCount = formData.get("customerCount") as string;

    const { error } = await supabase.from("past_employments").insert({
        profile_id: profileId,
        store_name: storeName,
        period: period || null,
        hourly_wage: hourlyWage ? parseInt(hourlyWage) : null,
        sales_amount: salesAmount ? parseInt(salesAmount) : null,
        customer_count: customerCount ? parseInt(customerCount) : null,
    });

    if (error) {
        console.error("Error creating past employment:", error);
        throw new Error("過去在籍店の追加に失敗しました");
    }

    revalidatePath("/app/users");
    return { success: true };
}

export async function updatePastEmployment(id: string, formData: FormData) {
    const supabase = await createServerClient() as any;

    const storeName = formData.get("storeName") as string;
    const period = formData.get("period") as string;
    const hourlyWage = formData.get("hourlyWage") as string;
    const salesAmount = formData.get("salesAmount") as string;
    const customerCount = formData.get("customerCount") as string;

    const { error } = await supabase
        .from("past_employments")
        .update({
            store_name: storeName,
            period: period || null,
            hourly_wage: hourlyWage ? parseInt(hourlyWage) : null,
            sales_amount: salesAmount ? parseInt(salesAmount) : null,
            customer_count: customerCount ? parseInt(customerCount) : null,
        })
        .eq("id", id);

    if (error) {
        console.error("Error updating past employment:", error);
        throw new Error("過去在籍店の更新に失敗しました");
    }

    revalidatePath("/app/users");
    return { success: true };
}

export async function deletePastEmployment(id: string) {
    const supabase = await createServerClient() as any;
    const { error } = await supabase.from("past_employments").delete().eq("id", id);

    if (error) {
        console.error("Error deleting past employment:", error);
        throw new Error("過去在籍店の削除に失敗しました");
    }

    revalidatePath("/app/users");
    return { success: true };
}

export async function getProfileReportData(profileId: string, role: string) {
    const supabase = await createServerClient() as any;

    if (role === "guest") {
        // ゲスト: 来店回数（セッション数）を取得
        const { data: sessions, error } = await supabase
            .from("sessions")
            .select("id, start_time")
            .eq("guest_id", profileId);

        if (error) {
            console.error("Error fetching guest sessions:", error);
            return { visitCount: 0, sessions: [] };
        }

        // 月別来店回数を集計
        const monthlyVisits: Record<string, number> = {};
        sessions?.forEach(session => {
            const date = new Date(session.start_time);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyVisits[key] = (monthlyVisits[key] || 0) + 1;
        });

        return {
            visitCount: sessions?.length || 0,
            monthlyVisits,
        };
    } else {
        // キャスト・スタッフ: 出勤データを取得
        const { data: attendances, error } = await supabase
            .from("attendances")
            .select("id, clock_in, clock_out")
            .eq("profile_id", profileId)
            .not("clock_out", "is", null);

        if (error) {
            console.error("Error fetching attendances:", error);
            return { attendanceCount: 0, totalWorkMinutes: 0, monthlyData: {} };
        }

        // 総勤務時間と月別データを計算
        let totalWorkMinutes = 0;
        const monthlyData: Record<string, { count: number; minutes: number }> = {};

        attendances?.forEach(attendance => {
            if (attendance.clock_in && attendance.clock_out) {
                const clockIn = new Date(attendance.clock_in);
                const clockOut = new Date(attendance.clock_out);
                const minutes = Math.round((clockOut.getTime() - clockIn.getTime()) / (1000 * 60));
                totalWorkMinutes += minutes;

                const key = `${clockIn.getFullYear()}-${String(clockIn.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyData[key]) {
                    monthlyData[key] = { count: 0, minutes: 0 };
                }
                monthlyData[key].count += 1;
                monthlyData[key].minutes += minutes;
            }
        });

        return {
            attendanceCount: attendances?.length || 0,
            totalWorkMinutes,
            monthlyData,
        };
    }
}

export async function updateProfileSalarySystems(profileId: string, salarySystemIds: string[]) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Delete existing assignments
    const { error: deleteError } = await supabase
        .from("profile_salary_systems")
        .delete()
        .eq("profile_id", profileId);

    if (deleteError) {
        console.error("Error deleting salary systems:", deleteError);
        throw new Error("Failed to update salary systems");
    }

    // Insert new assignments
    if (salarySystemIds.length > 0) {
        const insertData = salarySystemIds.map(id => ({
            profile_id: profileId,
            salary_system_id: id,
        }));

        const { error: insertError } = await supabase
            .from("profile_salary_systems")
            .insert(insertData);

        if (insertError) {
            console.error("Error inserting salary systems:", insertError);
            throw new Error("Failed to update salary systems");
        }
    }

    revalidatePath("/app/users");
    return { success: true };
}

// ユーザーページ初期データ取得（クライアントサイドフェッチ用）
export async function getUsersPageData() {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { redirect: "/login" };
    }

    // Resolve current profile via users.current_profile_id
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return { redirect: "/app/me" };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("id, store_id, role, role_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile || !profile.store_id) {
        return { redirect: "/app/me" };
    }

    // Role check - staff and admin can access
    if (profile.role !== "staff" && profile.role !== "admin") {
        return { redirect: "/app/dashboard?accessDenied=users" };
    }

    // 権限チェック用にロール権限を取得
    let permissions: Record<string, string> | null = null;
    if (profile.role_id) {
        const { data: storeRole } = await supabase
            .from("store_roles")
            .select("permissions")
            .eq("id", profile.role_id)
            .maybeSingle();
        permissions = storeRole?.permissions || null;
    }

    // 各ページの権限をチェック
    const checkPermission = (pageKey: string) => {
        if (profile.role === "admin") return true;
        if (!permissions) return profile.role === "staff";
        const level = permissions[pageKey];
        return level === "view" || level === "edit";
    };

    const canEdit = profile.role === "admin" || (permissions?.users === "edit");

    return {
        data: {
            storeId: profile.store_id,
            canEdit,
            hidePersonalInfo: !checkPermission("users-personal-info"),
            pagePermissions: {
                bottles: checkPermission("bottles"),
                resumes: checkPermission("resumes"),
                salarySystems: checkPermission("salary-systems"),
                attendance: checkPermission("attendance"),
                personalInfo: checkPermission("users-personal-info"),
            },
        },
    };
}

// プロフィール一覧取得（クライアントサイドフェッチ用）
export async function getProfiles() {
    const supabase = await createServerClient() as any;
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

    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*, stores(*)")
        .eq("store_id", currentProfile.store_id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching profiles:", error);
        return [];
    }

    return profiles || [];
}

// ============================================
// AIレポート生成
// ============================================

export interface AIReportResult {
    success: boolean;
    report?: string;
    error?: string;
}

export async function generateProfileAIReport(
    profileId: string,
    role: string
): Promise<AIReportResult> {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "認証が必要です" };
    }

    // Get profile data
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name, display_name_kana, real_name, role, status, store_id, created_at")
        .eq("id", profileId)
        .maybeSingle();

    if (!profile) {
        return { success: false, error: "プロフィールが見つかりません" };
    }

    // Collect data based on role
    let contextData = "";
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    if (role === "guest") {
        // Guest: Get session/visit data
        const { data: sessions } = await supabase
            .from("sessions")
            .select("id, start_time, end_time, seat_id, seats(name)")
            .eq("guest_id", profileId)
            .order("start_time", { ascending: false })
            .limit(100);

        const { data: slips } = await supabase
            .from("slips")
            .select("id, total_amount, status, created_at")
            .eq("guest_id", profileId)
            .eq("status", "paid")
            .order("created_at", { ascending: false })
            .limit(50);

        const totalVisits = sessions?.length || 0;
        const totalSpent = slips?.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0) || 0;
        const avgSpent = slips && slips.length > 0 ? Math.round(totalSpent / slips.length) : 0;

        // Monthly visits
        const monthlyVisits: Record<string, number> = {};
        sessions?.forEach((s: any) => {
            const date = new Date(s.start_time);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyVisits[key] = (monthlyVisits[key] || 0) + 1;
        });

        // Recent visits
        const recentVisits = sessions?.slice(0, 5).map((s: any) => {
            const date = new Date(s.start_time);
            return `${date.toLocaleDateString('ja-JP')} (${(s.seats as any)?.name || '不明'})`;
        }).join(', ') || 'なし';

        // Calculate visit frequency
        const firstVisit = sessions && sessions.length > 0 ? new Date(sessions[sessions.length - 1].start_time) : null;
        const daysSinceFirst = firstVisit ? Math.floor((now.getTime() - firstVisit.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const visitFrequency = daysSinceFirst > 0 && totalVisits > 0 ? Math.round(daysSinceFirst / totalVisits) : 0;

        contextData = `
## ゲスト情報
- 名前: ${profile.display_name || '不明'}
- ステータス: ${profile.status || '不明'}
- 登録日: ${profile.created_at ? new Date(profile.created_at).toLocaleDateString('ja-JP') : '不明'}

## 来店データ
- 総来店回数: ${totalVisits}回
- 総利用金額: ¥${totalSpent.toLocaleString()}
- 平均利用金額: ¥${avgSpent.toLocaleString()}
- 来店頻度: 約${visitFrequency}日に1回
- 最近の来店: ${recentVisits}

## 月別来店回数（直近6ヶ月）
${Object.entries(monthlyVisits)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .map(([month, count]) => `- ${month}: ${count}回`)
    .join('\n') || '- データなし'}
`;
    } else {
        // Cast/Staff: Get attendance and performance data
        const { data: workRecords } = await supabase
            .from("work_records")
            .select("id, work_date, clock_in, clock_out, status")
            .eq("profile_id", profileId)
            .gte("work_date", sixMonthsAgo.toISOString().split('T')[0])
            .order("work_date", { ascending: false });

        // Calculate work stats
        let totalWorkMinutes = 0;
        const monthlyData: Record<string, { count: number; minutes: number }> = {};

        workRecords?.forEach((wr: any) => {
            if (wr.clock_in && wr.clock_out) {
                const clockIn = new Date(wr.clock_in);
                const clockOut = new Date(wr.clock_out);
                const minutes = Math.round((clockOut.getTime() - clockIn.getTime()) / (1000 * 60));
                if (minutes > 0 && minutes < 24 * 60) {
                    totalWorkMinutes += minutes;
                    const key = `${clockIn.getFullYear()}-${String(clockIn.getMonth() + 1).padStart(2, '0')}`;
                    if (!monthlyData[key]) {
                        monthlyData[key] = { count: 0, minutes: 0 };
                    }
                    monthlyData[key].count += 1;
                    monthlyData[key].minutes += minutes;
                }
            }
        });

        const totalDays = workRecords?.length || 0;
        const avgWorkHours = totalDays > 0 ? Math.round(totalWorkMinutes / totalDays / 60 * 10) / 10 : 0;

        // Get session data for cast (if applicable)
        let sessionStats = "";
        if (role === "cast") {
            const { data: castSessions } = await supabase
                .from("session_casts")
                .select("session_id, sessions(id, start_time, end_time, guest_id)")
                .eq("cast_id", profileId)
                .limit(100);

            const uniqueGuests = new Set(castSessions?.map((sc: any) => (sc.sessions as any)?.guest_id).filter(Boolean));
            sessionStats = `
## 接客データ
- 接客セッション数: ${castSessions?.length || 0}回
- ユニーク顧客数: ${uniqueGuests.size}名`;
        }

        contextData = `
## ${role === 'cast' ? 'キャスト' : 'スタッフ'}情報
- 名前: ${profile.display_name || '不明'}
- ステータス: ${profile.status || '不明'}
- 登録日: ${profile.created_at ? new Date(profile.created_at).toLocaleDateString('ja-JP') : '不明'}

## 勤務データ（直近6ヶ月）
- 出勤日数: ${totalDays}日
- 総勤務時間: ${Math.floor(totalWorkMinutes / 60)}時間${totalWorkMinutes % 60}分
- 平均勤務時間: ${avgWorkHours}時間/日

## 月別勤務実績
${Object.entries(monthlyData)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .map(([month, data]) => `- ${month}: ${data.count}日 / ${Math.floor(data.minutes / 60)}時間${data.minutes % 60}分`)
    .join('\n') || '- データなし'}
${sessionStats}
`;
    }

    // Generate AI report using OpenAI
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/ai/generate-report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                profileId,
                role,
                contextData,
                profileName: profile.display_name || '不明',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("AI report generation failed:", errorText);
            return { success: false, error: "レポート生成に失敗しました" };
        }

        const result = await response.json();
        return { success: true, report: result.report };
    } catch (error) {
        console.error("Error generating AI report:", error);
        return { success: false, error: "レポート生成中にエラーが発生しました" };
    }
}
