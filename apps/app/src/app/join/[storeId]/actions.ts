"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { createServiceRoleClient } from "@/lib/supabaseServiceClient";
import { revalidatePath } from "next/cache";

export async function resetRejectedJoinRequest(storeId: string) {
    const supabase = await createServerClient() as any;
    const serviceSupabase = createServiceRoleClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false };
    }

    // Find existing profile for this user+store
    const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .eq("store_id", storeId)
        .maybeSingle();

    if (!existingProfile) {
        return { success: true };
    }

    // Delete rejected join request (use service role to bypass RLS)
    await serviceSupabase
        .from("join_requests")
        .delete()
        .eq("profile_id", existingProfile.id)
        .eq("status", "rejected");

    return { success: true };
}

export async function getStoreForJoin(storeId: string) {
    const supabase = await createServerClient() as any;
    // Use service role client to bypass RLS for store_settings (new users don't have profiles yet)
    const serviceSupabase = createServiceRoleClient() as any;

    // Fetch store basic info
    const { data: store, error } = await supabase
        .from("stores")
        .select("id, name, industry, prefecture, icon_url")
        .eq("id", storeId)
        .maybeSingle();

    if (error || !store) {
        return { success: false, error: "店舗が見つかりませんでした" };
    }

    // Fetch store settings to check join permissions (use service role to bypass RLS)
    const { data: settings } = await serviceSupabase
        .from("store_settings")
        .select("allow_join_requests, allow_join_by_url")
        .eq("store_id", storeId)
        .maybeSingle();

    if (!settings?.allow_join_requests || !settings?.allow_join_by_url) {
        return { success: false, error: "この店舗はURL参加を受け付けていません" };
    }

    return { success: true, store };
}

export async function submitJoinRequest(formData: FormData) {
    const supabase = await createServerClient() as any;
    const serviceSupabase = createServiceRoleClient() as any;
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

    // Verify store exists and accepts URL joins
    const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("id", storeId)
        .maybeSingle();

    if (!store) {
        return { success: false, error: "店舗が見つかりませんでした" };
    }

    // Use service role to bypass RLS for store_settings
    const { data: settings } = await serviceSupabase
        .from("store_settings")
        .select("allow_join_requests, allow_join_by_url")
        .eq("store_id", storeId)
        .maybeSingle();

    if (!settings?.allow_join_requests || !settings?.allow_join_by_url) {
        return { success: false, error: "この店舗はURL参加を受け付けていません" };
    }

    // Check if user already has a profile for this store
    const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("user_id", user.id)
        .eq("store_id", storeId)
        .maybeSingle();

    // Check if user already has a join request for this store
    if (existingProfile) {
        const { data: existingJoinRequest } = await supabase
            .from("join_requests")
            .select("id, status")
            .eq("profile_id", existingProfile.id)
            .maybeSingle();

        if (existingJoinRequest) {
            if (existingJoinRequest.status === "pending") {
                return { success: false, error: "既にこの店舗への参加申請が承認待ちです" };
            }
            if (existingJoinRequest.status === "approved") {
                return { success: false, error: "既にこの店舗のメンバーです" };
            }
            // Rejected requests should have been deleted when page loaded, but handle just in case
        }

        if (existingProfile.role && existingProfile.role !== "guest") {
            return { success: false, error: "既にこの店舗のメンバーです" };
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

    // Create new join request (use service role to bypass RLS)
    const { data: newJoinRequest, error: joinRequestError } = await serviceSupabase
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
        })
        .select()
        .single();

    if (joinRequestError) {
        console.error("Join request creation error:", joinRequestError);
        return { success: false, error: joinRequestError.message };
    }

    console.log("[submitJoinRequest] Created join request:", newJoinRequest.id);

    revalidatePath("/");
    return { success: true, profileId };
}
