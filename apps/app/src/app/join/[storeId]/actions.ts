"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

export async function getStoreForJoin(storeId: string) {
    const supabase = await createServerClient() as any;

    const { data: store, error } = await supabase
        .from("stores")
        .select("id, name, industry, prefecture, allow_join_by_url, icon_url")
        .eq("id", storeId)
        .maybeSingle();

    if (error || !store) {
        return { success: false, error: "店舗が見つかりませんでした" };
    }

    if (!store.allow_join_by_url) {
        return { success: false, error: "この店舗はURL参加を受け付けていません" };
    }

    return { success: true, store };
}

export async function submitJoinRequest(formData: FormData) {
    const supabase = await createServerClient() as any;
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "ログインが必要です" };
    }

    const displayName = formData.get("display_name") as string;
    const displayNameKana = formData.get("display_name_kana") as string;
    const realName = formData.get("real_name") as string;
    const realNameKana = formData.get("real_name_kana") as string;
    const storeId = formData.get("store_id") as string;
    const role = formData.get("role") as string;

    if (!displayName || !displayNameKana || !storeId || !role) {
        return { success: false, error: "必須項目を入力してください" };
    }

    // Verify store accepts URL joins
    const { data: store } = await supabase
        .from("stores")
        .select("id, allow_join_by_url")
        .eq("id", storeId)
        .maybeSingle();

    if (!store || !store.allow_join_by_url) {
        return { success: false, error: "この店舗はURL参加を受け付けていません" };
    }

    // Check if user already has a profile for this store
    const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("user_id", user.id)
        .eq("store_id", storeId)
        .maybeSingle();

    if (existingProfile && existingProfile.role) {
        return { success: false, error: "既にこの店舗のメンバーです" };
    }

    // Check if user already has a pending join request for this store
    const { data: existingJoinRequest } = await supabase
        .from("join_requests")
        .select("id, status")
        .eq("store_id", storeId)
        .eq("status", "pending")
        .maybeSingle();

    // Check via profile_id if existingProfile exists
    if (existingProfile) {
        const { data: joinRequestByProfile } = await supabase
            .from("join_requests")
            .select("id, status")
            .eq("profile_id", existingProfile.id)
            .eq("status", "pending")
            .maybeSingle();

        if (joinRequestByProfile) {
            return { success: false, error: "既にこの店舗への参加申請が承認待ちです" };
        }
    }

    // Get user's avatar from existing profile if available
    const { data: existingUserProfile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", user.id)
        .not("avatar_url", "is", null)
        .limit(1)
        .maybeSingle();

    let profileId: string;

    if (existingProfile) {
        // Use existing profile
        profileId = existingProfile.id;
    } else {
        // Create profile without role (role will be set on approval)
        const insertData: Record<string, any> = {
            user_id: user.id,
            store_id: storeId,
            display_name: displayName,
            display_name_kana: displayNameKana,
            real_name: realName || null,
            real_name_kana: realNameKana || null,
        };

        // Copy avatar if available (don't copy line_user_id as it has unique constraint)
        if (existingUserProfile?.avatar_url) {
            insertData.avatar_url = existingUserProfile.avatar_url;
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .insert(insertData)
            .select()
            .single();

        if (profileError) {
            console.error("Profile creation error:", profileError);
            return { success: false, error: profileError.message };
        }

        profileId = profile.id;

        // Update user's current_profile_id
        await supabase
            .from("users")
            .update({ current_profile_id: profile.id })
            .eq("id", user.id);
    }

    // Create join request in the join_requests table
    const { error: joinRequestError } = await supabase
        .from("join_requests")
        .insert({
            store_id: storeId,
            profile_id: profileId,
            display_name: displayName,
            display_name_kana: displayNameKana,
            real_name: realName || null,
            real_name_kana: realNameKana || null,
            requested_role: role,
            status: "pending",
        });

    if (joinRequestError) {
        console.error("Join request creation error:", joinRequestError);
        return { success: false, error: joinRequestError.message };
    }

    revalidatePath("/");
    return { success: true, profileId };
}
