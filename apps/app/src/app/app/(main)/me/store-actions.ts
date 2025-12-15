"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

export async function searchStoreByCode(storeCode: string) {
    const supabase = await createServerClient() as any;

    const { data: store, error } = await supabase
        .from("stores")
        .select("id, name, industry, prefecture, allow_join_by_code")
        .eq("id", storeCode)
        .maybeSingle();

    if (error || !store) {
        return { success: false, error: "店舗が見つかりませんでした" };
    }

    if (!store.allow_join_by_code) {
        return { success: false, error: "この店舗はコードからの参加を受け付けていません" };
    }

    return { success: true, store };
}

export async function submitJoinRequestFromMe(data: {
    storeId: string;
    role: "cast" | "staff";
    displayName: string;
    displayNameKana: string;
}) {
    const supabase = await createServerClient() as any;
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "ログインが必要です" };
    }

    // Verify store accepts join by code
    const { data: store } = await supabase
        .from("stores")
        .select("id, allow_join_by_code")
        .eq("id", data.storeId)
        .maybeSingle();

    if (!store || !store.allow_join_by_code) {
        return { success: false, error: "この店舗はコードからの参加を受け付けていません" };
    }

    // Check if user already has a profile for this store
    const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("user_id", user.id)
        .eq("store_id", data.storeId)
        .maybeSingle();

    // Only block if user is already an approved member (cast or staff)
    if (existingProfile && existingProfile.role && existingProfile.role !== "guest") {
        return { success: false, error: "既にこの店舗のメンバーです" };
    }

    // Check for pending join request
    if (existingProfile) {
        const { data: existingJoinRequest } = await supabase
            .from("join_requests")
            .select("id")
            .eq("profile_id", existingProfile.id)
            .eq("status", "pending")
            .maybeSingle();

        if (existingJoinRequest) {
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
        profileId = existingProfile.id;
    } else {
        // Create profile without role (role will be set on approval)
        const insertData: Record<string, unknown> = {
            user_id: user.id,
            store_id: data.storeId,
            display_name: data.displayName,
            display_name_kana: data.displayNameKana,
        };

        // Copy avatar if available
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

    // Create join request
    const { error: joinRequestError } = await supabase
        .from("join_requests")
        .insert({
            store_id: data.storeId,
            profile_id: profileId,
            display_name: data.displayName,
            display_name_kana: data.displayNameKana,
            requested_role: data.role,
            status: "pending",
        });

    if (joinRequestError) {
        console.error("Join request creation error:", joinRequestError);
        return { success: false, error: joinRequestError.message };
    }

    revalidatePath("/");
    return { success: true, profileId };
}

export async function createNewStore(data: {
    storeName: string;
    industry: string;
    prefecture: string;
    ownerDisplayName: string;
    ownerDisplayNameKana: string;
}) {
    const supabase = await createServerClient() as any;
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "ログインが必要です" };
    }

    // Create store
    const { data: store, error: storeError } = await supabase
        .from("stores")
        .insert({
            name: data.storeName,
            industry: data.industry,
            prefecture: data.prefecture,
            show_menus: true,
        })
        .select()
        .single();

    if (storeError) {
        console.error("Store creation error:", storeError);
        return { success: false, error: storeError.message };
    }

    // Create default roles for the store using service role to bypass RLS
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: staffRole, error: staffRoleError } = await serviceClient
        .from("store_roles")
        .insert({
            store_id: store.id,
            name: "デフォルトスタッフ",
            permissions: {
                can_manage_roles: true,
                can_manage_users: true,
                can_manage_settings: true,
                can_manage_attendance: true,
                can_manage_menus: true,
                can_manage_bottles: true,
                can_view_reports: true,
            },
            is_system_role: true,
        })
        .select()
        .single();

    if (staffRoleError || !staffRole) {
        console.error("Failed to create Staff role:", staffRoleError);
        await supabase.from("stores").delete().eq("id", store.id);
        return { success: false, error: "デフォルトロールの作成に失敗しました" };
    }

    const { error: castRoleError } = await serviceClient
        .from("store_roles")
        .insert({
            store_id: store.id,
            name: "デフォルトキャスト",
            permissions: {
                target: "cast",
            },
            is_system_role: true,
        });

    if (castRoleError) {
        console.error("Failed to create Cast role:", castRoleError);
        await supabase.from("stores").delete().eq("id", store.id);
        return { success: false, error: "デフォルトロールの作成に失敗しました" };
    }

    // Get user's avatar from existing profile if available
    const { data: existingUserProfile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", user.id)
        .not("avatar_url", "is", null)
        .limit(1)
        .maybeSingle();

    // Create new profile for this store
    const profileData: Record<string, unknown> = {
        user_id: user.id,
        store_id: store.id,
        display_name: data.ownerDisplayName,
        display_name_kana: data.ownerDisplayNameKana,
        role: "staff",
        role_id: staffRole.id,
    };

    // Copy avatar if available
    if (existingUserProfile?.avatar_url) {
        profileData.avatar_url = existingUserProfile.avatar_url;
    }

    const { data: profile, error: profileError } = await serviceClient
        .from("profiles")
        .insert(profileData)
        .select()
        .single();

    if (profileError) {
        console.error("Profile creation error:", profileError);
        await serviceClient.from("stores").delete().eq("id", store.id);
        return { success: false, error: profileError.message };
    }

    // Update user's current_profile_id
    await supabase
        .from("users")
        .update({ current_profile_id: profile.id })
        .eq("id", user.id);

    revalidatePath("/");
    return { success: true, storeId: store.id };
}
