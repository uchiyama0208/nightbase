"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

export async function searchStoreByCode(storeCode: string) {
    const supabase = await createServerClient();

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
    const supabase = await createServerClient();
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
        .select("id, approval_status")
        .eq("user_id", user.id)
        .eq("store_id", data.storeId)
        .maybeSingle();

    if (existingProfile) {
        if (existingProfile.approval_status === "pending") {
            return { success: false, error: "既にこの店舗への参加申請が承認待ちです" };
        }
        if (existingProfile.approval_status === "approved") {
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

    // Create profile with pending status
    const insertData: Record<string, unknown> = {
        user_id: user.id,
        store_id: data.storeId,
        display_name: data.displayName,
        display_name_kana: data.displayNameKana,
        role: data.role,
        approval_status: "pending",
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

    // Update user's current_profile_id
    await supabase
        .from("users")
        .update({ current_profile_id: profile.id })
        .eq("id", user.id);

    revalidatePath("/");
    return { success: true, profileId: profile.id };
}

export async function createNewStore(data: {
    storeName: string;
    industry: string;
    prefecture: string;
    ownerDisplayName: string;
    ownerDisplayNameKana: string;
}) {
    const supabase = await createServerClient();
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
        approval_status: "approved",
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
