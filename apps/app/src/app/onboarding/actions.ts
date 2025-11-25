"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function searchStore(storeId: string) {
    const supabase = await createServerClient();

    const { data: store, error } = await supabase
        .from("stores")
        .select("id, name, industry, prefecture, allow_join_requests")
        .eq("id", storeId)
        .maybeSingle();

    if (error || !store) {
        return { success: false, error: "店舗が見つかりませんでした" };
    }

    if (!store.allow_join_requests) {
        return { success: false, error: "この店舗は参加申請を受け付けていません" };
    }

    return { success: true, store };
}

export async function createPendingProfile(formData: FormData) {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "Unauthorized" };
    }

    const displayName = formData.get("display_name") as string;
    const displayNameKana = formData.get("display_name_kana") as string;
    const realName = formData.get("real_name") as string;
    const realNameKana = formData.get("real_name_kana") as string;
    const storeId = formData.get("store_id") as string;
    const role = formData.get("role") as string;

    // Create profile with pending status
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .insert({
            user_id: user.id,
            store_id: storeId,
            display_name: displayName,
            display_name_kana: displayNameKana,
            real_name: realName,
            real_name_kana: realNameKana,
            role: role,
            approval_status: "pending",
        })
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

export async function checkApprovalStatus() {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "Unauthorized" };
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return { success: false, status: null };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("approval_status, store_id, stores(name)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile) {
        return { success: false, status: null };
    }

    return {
        success: true,
        status: profile.approval_status,
        storeName: (profile.stores as any)?.name,
    };
}

export async function createProfileOnly(formData: FormData) {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "Unauthorized" };
    }

    const displayName = formData.get("display_name") as string;
    const displayNameKana = formData.get("display_name_kana") as string;
    const realName = formData.get("real_name") as string;
    const realNameKana = formData.get("real_name_kana") as string;

    // For join-store mode, we don't create a store yet
    // The user will need to use an invitation link or be assigned to a store
    // For now, we'll create a profile without a store_id
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .insert({
            user_id: user.id,
            display_name: displayName,
            display_name_kana: displayNameKana,
            real_name: realName,
            real_name_kana: realNameKana,
            role: "cast", // Default role for joining users
        })
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

export async function upsertOwnerProfile(formData: FormData) {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "Unauthorized" };
    }

    const displayName = formData.get("display_name") as string;
    const displayNameKana = formData.get("display_name_kana") as string;
    const realName = formData.get("real_name") as string;
    const realNameKana = formData.get("real_name_kana") as string;

    // Check if profile already exists
    const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

    let profileId;

    if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
            .from("profiles")
            .update({
                display_name: displayName,
                display_name_kana: displayNameKana,
                real_name: realName,
                real_name_kana: realNameKana,
                role: "staff", // Ensure role is staff for store creators
            })
            .eq("id", existingProfile.id);

        if (updateError) {
            console.error("Profile update error:", updateError);
            return { success: false, error: updateError.message };
        }
        profileId = existingProfile.id;
    } else {
        const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
                user_id: user.id,
                display_name: displayName,
                display_name_kana: displayNameKana,
                real_name: realName,
                real_name_kana: realNameKana,
                role: "staff", // Changed from "admin" to "staff" to match access control checks
            })
            .select()
            .single();

        if (createError) {
            console.error("Profile creation error:", createError);
            return { success: false, error: createError.message };
        }
        profileId = newProfile.id;
    }

    // Update user's current_profile_id
    await supabase
        .from("users")
        .update({ current_profile_id: profileId })
        .eq("id", user.id);

    revalidatePath("/");
    return { success: true, profileId };
}

export async function createStoreAndLink(storeData: FormData) {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "Unauthorized" };
    }

    // Get current profile
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return { success: false, error: "Profile not found" };
    }

    // Create store
    const storeName = storeData.get("name") as string;
    const industry = storeData.get("industry") as string;
    const prefecture = storeData.get("prefecture") as string;
    const businessStartTime = storeData.get("business_start_time") as string;
    const businessEndTime = storeData.get("business_end_time") as string;
    const daySwitchTime = storeData.get("day_switch_time") as string;
    const closedDays = storeData.getAll("closed_days") as string[];
    const referralSource = storeData.get("referral_source") as string;

    const { data: store, error: storeError } = await supabase
        .from("stores")
        .insert({
            name: storeName,
            industry,
            prefecture,
            business_start_time: businessStartTime,
            business_end_time: businessEndTime,
            day_switch_time: daySwitchTime,
            closed_days: closedDays,
            referral_source: referralSource,
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
            name: "スタッフ",
            permissions: {
                can_manage_roles: true,
                can_manage_users: true,
                can_manage_settings: true,
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

    const { data: castRole, error: castRoleError } = await serviceClient
        .from("store_roles")
        .insert({
            store_id: store.id,
            name: "キャスト",
            permissions: {},
            is_system_role: true,
        })
        .select()
        .single();

    if (castRoleError || !castRole) {
        console.error("Failed to create Cast role:", castRoleError);
        await supabase.from("stores").delete().eq("id", store.id);
        return { success: false, error: "デフォルトロールの作成に失敗しました" };
    }

    // Link store and role to profile
    const { error: profileError } = await supabase
        .from("profiles")
        .update({
            store_id: store.id,
            role_id: staffRole.id,
        })
        .eq("id", appUser.current_profile_id);

    if (profileError) {
        console.error("Profile update error:", profileError);
        // Rollback: delete the store (cascade should handle roles)
        await supabase.from("stores").delete().eq("id", store.id);
        return { success: false, error: profileError.message };
    }

    revalidatePath("/");
    return { success: true, storeId: store.id };
}

export async function getOnboardingStatus() {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { hasProfile: false, hasStore: false };
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return { hasProfile: false, hasStore: false };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("id, store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    return {
        hasProfile: !!profile,
        hasStore: !!profile?.store_id,
        profileId: profile?.id,
    };
}

export async function saveProfileData(formData: FormData) {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "Unauthorized" };
    }

    const displayName = formData.get("display_name") as string;
    const displayNameKana = formData.get("display_name_kana") as string;
    const realName = formData.get("real_name") as string;
    const realNameKana = formData.get("real_name_kana") as string;
    const mode = formData.get("mode") as string;

    // Store in session or temporary storage
    // For now, we'll return the data to be used in the next step
    return {
        success: true,
        data: {
            display_name: displayName,
            display_name_kana: displayNameKana,
            real_name: realName,
            real_name_kana: realNameKana,
            mode,
        },
    };
}
