"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function switchProfile(profileId: string) {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    // Verify that the profile belongs to the user
    const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", profileId)
        .eq("user_id", user.id)
        .single();

    if (!profile) {
        throw new Error("Profile not found or does not belong to user");
    }

    // Update user's current_profile_id
    const { error } = await supabase
        .from("users")
        .update({ current_profile_id: profileId })
        .eq("id", user.id);

    if (error) {
        console.error("Error switching profile:", error);
        throw new Error("Failed to switch profile");
    }

    revalidatePath("/", "layout");
    redirect("/app/dashboard");
}

export async function signOut() {
    const supabase = await createServerClient() as any;
    await supabase.auth.signOut();
    redirect("/login");
}

export async function getUserProfile() {
    const supabase = await createServerClient() as any;
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        throw new Error("Unauthorized");
    }

    // Get profile data
    // Get current_profile_id
    const { data: userData } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .single();

    let profile;
    if (userData?.current_profile_id) {
        const { data } = await supabase
            .from("profiles")
            .select("display_name, line_user_id")
            .eq("id", userData.current_profile_id)
            .single();
        profile = data;
    } else {
        const { data } = await supabase
            .from("profiles")
            .select("display_name, line_user_id")
            .eq("user_id", user.id)
            .maybeSingle();
        profile = data;
    }

    return {
        email: user.email,
        name: profile?.display_name || "",
        lineUserId: profile?.line_user_id,
        userId: user.id,
    };
}

export async function updateUserEmail(newEmail: string) {
    const supabase = await createServerClient() as any;
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "Unauthorized" };
    }

    // Use admin client to bypass email confirmation
    const supabaseAdmin = createServiceRoleClient() as any;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        {
            email: newEmail,
            email_confirm: true, // Auto-confirm the new email
        }
    );

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/app/me");
    return { success: true };
}

export async function updateUserPassword(newPassword: string) {
    const supabase = await createServerClient() as any;
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });

    if (error) {
        // Translate common error messages to Japanese
        let errorMessage = error.message;
        if (error.message.includes("New password should be different from the old password")) {
            errorMessage = "新しいパスワードは現在のパスワードと異なるものを設定してください。";
        }
        return { success: false, error: errorMessage };
    }

    return { success: true };
}

export async function deleteAccount() {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", user.id);

    if (error) {
        console.error("Error deleting user account:", error);
        throw new Error("Failed to delete account");
    }

    await supabase.auth.signOut();

    redirect("/login");
}

import { createServiceRoleClient } from "@/lib/supabaseServiceClient";

export async function unlinkLine() {
    const supabase = await createServerClient() as any;
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "Unauthorized" };
    }

    // Check if user has a primary_email (meaning they have email login set up)
    // Or if their auth email is not a LINE placeholder
    const { data: userData } = await supabase
        .from("users")
        .select("primary_email, current_profile_id")
        .eq("id", user.id)
        .single();

    // Get current auth user email
    const isLinePlaceholderEmail = user.email?.endsWith("@line.nightbase.app") ||
                                     user.email?.endsWith("@line-v2.nightbase.app");

    // If user only has LINE login (no email/password set up), prevent unlinking
    if (isLinePlaceholderEmail && !userData?.primary_email) {
        return {
            success: false,
            error: "LINE連携を解除するには、先にメールアドレスとパスワードでのログインを設定してください。"
        };
    }

    // Clear line_user_id and line_is_friend from all profiles for this user
    const { error: updateError } = await supabase
        .from("profiles")
        .update({
            line_user_id: null,
            line_is_friend: null
        })
        .eq("user_id", user.id);

    if (updateError) {
        console.error("Error unlinking LINE:", updateError);
        return { success: false, error: "LINE連携の解除に失敗しました" };
    }

    revalidatePath("/app/me");
    return { success: true };
}

export async function enableEmailLogin(email: string, password: string) {
    const supabase = await createServerClient() as any;
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "Unauthorized" };
    }

    // Use admin client to bypass secure email change flow (which requires verifying old email)
    // This is safe because the user is already authenticated via LINE
    const supabaseAdmin = createServiceRoleClient() as any;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        {
            email: email,
            password: password,
            email_confirm: true, // Auto-confirm the new email
            user_metadata: {
                email_confirmed_at: new Date().toISOString(), // Explicitly set confirmation timestamp
            }
        }
    );

    if (error) {
        console.error("Error enabling email login:", error);
        return { success: false, error: error.message };
    }

    // Update primary_email in public.users table
    const { error: updatePrimaryEmailError } = await supabase
        .from("users")
        .update({ primary_email: email })
        .eq("id", user.id);

    if (updatePrimaryEmailError) {
        console.error("Error updating primary_email:", updatePrimaryEmailError);
        // Don't fail the entire operation, just log the error
    }

    // Re-authenticate the user with the new credentials to prevent logout
    // This creates a new session and updates the cookies
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (signInError) {
        console.error("Error re-authenticating user:", signInError);
        return { success: false, error: "認証情報を更新しましたが、再ログインに失敗しました。一度ログアウトして、新しいメールアドレスとパスワードでログインしてください。" };
    }

    revalidatePath("/app/me");
    return { success: true };
}

// ページデータ取得（SPA用）
export async function getMePageData() {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { redirect: "/login" };
    }

    // Get current user details to know current_profile_id, avatar, and display_name
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id, avatar_url, display_name")
        .eq("id", user.id)
        .single();

    // Fetch all profiles for this user with store details and salary system
    const { data: profiles } = await supabase
        .from("profiles")
        .select(`
            id, display_name, avatar_url, role,
            stores(id, name, icon_url),
            profile_salary_systems(salary_systems(hourly_settings))
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    const currentProfileId = appUser?.current_profile_id;

    // If user has no profiles, redirect to store creation/join page
    if (!profiles || profiles.length === 0) {
        return { redirect: "/onboarding/choice" };
    }

    // Get current profile
    const currentProfile = profiles.find(p => p.id === currentProfileId) || profiles[0];
    const storesData = currentProfile?.stores as unknown;
    const currentStore = (Array.isArray(storesData) ? storesData[0] : storesData) as { id: string; name: string; icon_url?: string | null } | null;

    // Fetch time cards for all user's profiles
    const profileIds = profiles.map(p => p.id);
    const { data: timeCardsRaw } = await supabase
        .from("work_records")
        .select("id, work_date, clock_in, clock_out, profile_id")
        .in("profile_id", profileIds)
        .order("work_date", { ascending: false });

    // Map time cards with store info and calculate earnings
    const timeCards = (timeCardsRaw || []).map(tc => {
        const profile = profiles.find(p => p.id === tc.profile_id) as any;
        const storeData = profile?.stores as unknown;
        const store = (Array.isArray(storeData) ? storeData[0] : storeData) as { id: string; name: string; icon_url?: string | null } | null;

        // Get hourly wage from salary system
        const salarySystemData = profile?.profile_salary_systems?.[0]?.salary_systems;
        const hourlySettings = salarySystemData?.hourly_settings;
        const hourlyWage = hourlySettings?.base_hourly_wage || 0;

        // Calculate earnings if both clock_in and clock_out exist
        let earnings: number | null = null;
        if (tc.clock_in && tc.clock_out && hourlyWage > 0) {
            const start = new Date(tc.clock_in);
            const end = new Date(tc.clock_out);
            const hoursWorked = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            earnings = Math.floor(hoursWorked * hourlyWage);
        }

        return {
            id: tc.id,
            work_date: tc.work_date,
            clock_in: tc.clock_in,
            clock_out: tc.clock_out,
            store_name: store?.name || "不明",
            store_icon_url: store?.icon_url || null,
            earnings,
        };
    });

    // Fetch approved shift submissions for all user's profiles
    const { data: shiftsRaw } = await supabase
        .from("shift_submissions")
        .select(`
            id,
            availability,
            status,
            approved_start_time,
            approved_end_time,
            profile_id,
            shift_request_dates(target_date, shift_requests(store_id))
        `)
        .in("profile_id", profileIds)
        .eq("status", "approved")
        .eq("availability", "available");

    // Map shifts with store info
    const scheduledShifts = (shiftsRaw || []).map(shift => {
        const profile = profiles.find(p => p.id === shift.profile_id);
        const storeData = profile?.stores as unknown;
        const store = (Array.isArray(storeData) ? storeData[0] : storeData) as { id: string; name: string; icon_url?: string | null } | null;
        const dateInfo = shift.shift_request_dates as any;
        return {
            id: shift.id,
            target_date: dateInfo?.target_date || null,
            start_time: shift.approved_start_time,
            end_time: shift.approved_end_time,
            store_name: store?.name || "不明",
            store_icon_url: store?.icon_url || null,
        };
    }).filter(s => s.target_date);

    // Use LINE data (users table) if available, otherwise fall back to profile data
    const avatarUrl = appUser?.avatar_url || currentProfile?.avatar_url;
    const displayName = appUser?.display_name || currentProfile?.display_name;

    // Map profiles for client component
    const mappedProfiles = profiles.map(p => {
        const s = p.stores as unknown;
        const store = (Array.isArray(s) ? s[0] : s) as { id: string; name: string; icon_url?: string | null } | null;
        return {
            id: p.id,
            display_name: p.display_name,
            role: p.role,
            stores: store,
        };
    });

    return {
        data: {
            avatarUrl: avatarUrl || null,
            displayName: displayName || null,
            profiles: mappedProfiles,
            currentProfileId: currentProfileId || null,
            currentStore,
            timeCards,
            scheduledShifts,
        }
    };
}

// 設定ページデータ取得（SPA用）
export async function getMeSettingsPageData() {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { redirect: "/login" };
    }

    const profile = await getUserProfile();

    return {
        data: {
            email: profile.email || "",
            name: profile.name,
            identities: user.identities || [],
            userId: user.id,
            lineUserId: profile.lineUserId,
        }
    };
}
