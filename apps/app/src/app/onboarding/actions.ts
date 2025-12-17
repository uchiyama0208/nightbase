"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function searchStore(storeId: string) {
    const supabase = await createServerClient() as any;

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
    const supabase = await createServerClient() as any;
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

    // Check if user already has a profile for this store
    const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("user_id", user.id)
        .eq("store_id", storeId)
        .maybeSingle();

    // Only block if user is already an approved member (cast or staff)
    if (existingProfile && existingProfile.role && existingProfile.role !== "guest") {
        return { success: false, error: "既にこの店舗のメンバーです" };
    }

    let profileId: string;

    if (existingProfile) {
        // Check if there's already a pending join request
        const { data: existingJoinRequest } = await supabase
            .from("join_requests")
            .select("id")
            .eq("profile_id", existingProfile.id)
            .eq("status", "pending")
            .maybeSingle();

        if (existingJoinRequest) {
            return { success: false, error: "既にこの店舗への参加申請が承認待ちです" };
        }

        profileId = existingProfile.id;
    } else {
        // Create profile without role (role will be set on approval)
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .insert({
                user_id: user.id,
                store_id: storeId,
                display_name: displayName,
                display_name_kana: displayNameKana,
                real_name: realName,
                real_name_kana: realNameKana,
            })
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

export async function checkApprovalStatus() {
    const supabase = await createServerClient() as any;
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
        .select("id, role, store_id, stores(name)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile) {
        return { success: false, status: null };
    }

    // If profile has an approved role (cast or staff), they are approved
    // "guest" role means pending/unapproved
    if (profile.role && profile.role !== "guest") {
        return {
            success: true,
            status: "approved",
            storeName: (profile.stores as any)?.name,
        };
    }

    // Check join_requests table for pending status
    const { data: joinRequest } = await supabase
        .from("join_requests")
        .select("status")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    return {
        success: true,
        status: joinRequest?.status || null,
        storeName: (profile.stores as any)?.name,
    };
}

export async function createProfileOnly(formData: FormData) {
    const supabase = await createServerClient() as any;
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
    const supabase = await createServerClient() as any;
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
                role: "admin", // Store creator gets admin role
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
                role: "admin", // Store creator gets admin role
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
    const supabase = await createServerClient() as any;
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
            closed_days: closedDays,
            referral_source: referralSource,
        })
        .select()
        .single();

    if (storeError) {
        console.error("Store creation error:", storeError);
        return { success: false, error: storeError.message };
    }

    // Create store_settings record
    const { error: settingsError } = await supabase
        .from("store_settings")
        .insert({
            store_id: store.id,
            business_start_time: businessStartTime,
            business_end_time: businessEndTime,
            day_switch_time: daySwitchTime,
            show_menus: true, // Install menus feature by default
        });

    if (settingsError) {
        console.error("Store settings creation error:", settingsError);
        // Rollback: delete the store
        await supabase.from("stores").delete().eq("id", store.id);
        return { success: false, error: settingsError.message };
    }

    // Link store to profile using service role to bypass RLS
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: updatedProfile, error: profileError } = await serviceClient
        .from("profiles")
        .update({
            store_id: store.id,
        })
        .eq("id", appUser.current_profile_id)
        .select("id, store_id")
        .single();

    if (profileError) {
        console.error("Profile update error:", profileError);
        // Rollback: delete the store
        await serviceClient.from("stores").delete().eq("id", store.id);
        return { success: false, error: profileError.message };
    }

    // Verify the update actually happened
    if (!updatedProfile || updatedProfile.store_id !== store.id) {
        console.error("Profile update verification failed:", { updatedProfile, expectedStoreId: store.id });
        await serviceClient.from("stores").delete().eq("id", store.id);
        return { success: false, error: "プロファイルの更新に失敗しました" };
    }

    revalidatePath("/");
    return { success: true, storeId: store.id };
}

export async function getOnboardingStatus() {
    const supabase = await createServerClient() as any;
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

export async function withdrawJoinRequest() {
    const supabase = await createServerClient() as any;
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
        return { success: false, error: "Profile not found" };
    }

    // Get profile to check store_id
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile) {
        return { success: false, error: "Profile not found" };
    }

    // Delete the pending join request
    const { error: deleteJoinRequestError } = await supabase
        .from("join_requests")
        .delete()
        .eq("profile_id", profile.id)
        .eq("status", "pending");

    if (deleteJoinRequestError) {
        console.error("Delete join request error:", deleteJoinRequestError);
        return { success: false, error: deleteJoinRequestError.message };
    }

    // Delete the profile (only if it has no role)
    const { error: deleteProfileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", profile.id)
        .is("role", null);

    if (deleteProfileError) {
        console.error("Delete profile error:", deleteProfileError);
        // Continue even if profile deletion fails (might have a role)
    }

    // Clear current_profile_id
    await supabase
        .from("users")
        .update({ current_profile_id: null })
        .eq("id", user.id);

    revalidatePath("/");
    return { success: true };
}

export async function saveProfileData(formData: FormData) {
    const supabase = await createServerClient() as any;
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
