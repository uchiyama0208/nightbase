"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createStore(formData: FormData) {
    const storeName = formData.get("storeName") as string;
    const profileDisplayName = (formData.get("profileDisplayName") as string | null) ?? null;
    const supabase = await createServerClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    if (!storeName) {
        throw new Error("Store name is required");
    }

    // 1. Create Store
    const { data: store, error: storeError } = await supabase
        .from("stores")
        .insert({
            name: storeName,
            show_menus: true, // Install menus feature by default
        })
        .select()
        .single();

    if (storeError) {
        console.error("Error creating store:", storeError);
        throw new Error("Failed to create store");
    }

    // 2. Create Profile (Admin)
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .insert({
            user_id: user.id,
            store_id: store.id,
            role: "admin",
            display_name: profileDisplayName && profileDisplayName.trim().length > 0
                ? profileDisplayName.trim()
                : "Admin", // Default display name
        })
        .select()
        .single();

    if (profileError || !profile) {
        console.error("Error creating profile:", profileError);
        // Optional: Rollback store creation if profile fails (not easy with just Supabase client, ideally use RPC or just manual delete)
        await supabase.from("stores").delete().eq("id", store.id);
        throw new Error("Failed to create profile");
    }

    // 3. Set current_profile_id on users so /app uses this store/profile
    // users.id は auth.users.id と 1:1 で対応している前提で upsert する
    const { error: userUpdateError } = await supabase
        .from("users")
        .upsert(
            {
                id: user.id,
                // email カラムがある場合は一緒に更新しておく（無ければ無視される）
                email: (user as any).email ?? null,
                current_profile_id: profile.id,
            },
            { onConflict: "id" }
        );

    if (userUpdateError) {
        console.error("Error setting current_profile_id on users:", userUpdateError);
        // 続行は可能なので例外にはしない
    }

    revalidatePath("/app/settings");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/(main)", "layout");
    redirect("/app/settings");
}

export async function signOut() {
    const supabase = await createServerClient();
    await supabase.auth.signOut();
    redirect("/login");
}

export async function updateTimecardSettings(formData: FormData) {
    const showBreakColumns = formData.get("showBreakColumns") === "on";
    const tabletTimecardEnabled = formData.get("tabletTimecardEnabled") === "on";
    const tabletAcceptanceStartTime = formData.get("tabletAcceptanceStartTime") as string | null;
    const tabletAcceptanceEndTime = formData.get("tabletAcceptanceEndTime") as string | null;
    const tabletAllowedRoles = formData.getAll("tabletAllowedRoles") as string[];
    const tabletTheme = formData.get("tabletTheme") as string | null;

    // Location settings
    const locationCheckEnabled = formData.get("locationCheckEnabled") === "on";
    const latitude = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null;
    const longitude = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null;
    const locationRadius = formData.get("locationRadius") ? parseInt(formData.get("locationRadius") as string) : 50;

    // Time rounding settings
    const timeRoundingEnabled = formData.get("timeRoundingEnabled") === "on";
    const timeRoundingMethod = formData.get("timeRoundingMethod") as string | null;
    const timeRoundingMinutes = formData.get("timeRoundingMinutes") ? parseInt(formData.get("timeRoundingMinutes") as string) : 15;

    // Auto clock-out settings
    const autoClockoutEnabled = formData.get("autoClockoutEnabled") === "on";

    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Error fetching profile for timecard settings:", profileError);
        throw new Error("Failed to fetch profile for timecard settings");
    }

    if (!profile?.store_id) {
        throw new Error("Store not found for current user");
    }

    const updateData: any = {
        show_break_columns: showBreakColumns,
        tablet_timecard_enabled: tabletTimecardEnabled,
        location_check_enabled: locationCheckEnabled,
        latitude: latitude,
        longitude: longitude,
        location_radius: locationRadius,
        time_rounding_enabled: timeRoundingEnabled,
        time_rounding_method: timeRoundingMethod || "round",
        time_rounding_minutes: timeRoundingMinutes,
        auto_clockout_enabled: autoClockoutEnabled,
    };

    if (tabletTimecardEnabled) {
        updateData.tablet_acceptance_start_time = tabletAcceptanceStartTime || null;
        updateData.tablet_acceptance_end_time = tabletAcceptanceEndTime || null;
        updateData.tablet_allowed_roles = tabletAllowedRoles.length > 0 ? tabletAllowedRoles : ["staff", "cast"];
        updateData.tablet_theme = tabletTheme || "light";
    }

    const { error } = await supabase
        .from("stores")
        .update(updateData)
        .eq("id", profile.store_id);

    if (error) {
        console.error("Error updating store timecard settings:", error);
        throw new Error("Failed to update timecard settings");
    }

    revalidatePath("/app/settings");
    revalidatePath("/app/settings/timecard");
    revalidatePath("/app/timecard");
    revalidatePath(`/tablet/timecard/${profile.store_id}`);
}

export async function updateFeatureSettings(formData: FormData) {
    const showDashboard = formData.get("show_dashboard") === "on";
    const showAttendance = formData.get("show_attendance") === "on";
    const showTimecard = formData.get("show_timecard") === "on";
    const showUsers = formData.get("show_users") === "on";
    const showRoles = formData.get("show_roles") === "on";

    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Error fetching profile for feature settings:", profileError);
        throw new Error("Failed to fetch profile for feature settings");
    }

    if (!profile?.store_id) {
        throw new Error("Store not found for current user");
    }

    const { error } = await supabase
        .from("stores")
        .update({
            show_dashboard: showDashboard,
            show_attendance: showAttendance,
            show_timecard: showTimecard,
            show_users: showUsers,
            show_roles: showRoles,
        })
        .eq("id", profile.store_id);

    if (error) {
        console.error("Error updating feature settings:", error);
        throw new Error("Failed to update feature settings");
    }

    revalidatePath("/app/settings");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/attendance");
    revalidatePath("/app/users");
    revalidatePath("/app/roles");
    revalidatePath("/app/(main)", "layout");
    revalidatePath("/app/features");
    redirect("/app/features");
}

export async function updateStore(formData: FormData) {
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
        redirect("/app/me");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (profile.role !== "staff") {
        throw new Error(`Unauthorized: Current role is '${profile.role}'`);
    }

    const name = formData.get("name") as string;
    const business_start_time = formData.get("business_start_time") as string;
    const business_end_time = formData.get("business_end_time") as string;
    const day_switch_time = formData.get("day_switch_time") as string;
    const industry = formData.get("industry") as string;
    const prefecture = formData.get("prefecture") as string;
    const city = formData.get("city") as string;
    const address_line1 = formData.get("address_line1") as string;
    const address_line2 = formData.get("address_line2") as string;
    const postal_code = formData.get("postal_code") as string;
    const closed_days = formData.getAll("closed_days") as string[];
    const allow_join_requests = formData.get("allow_join_requests") === "on";

    await supabase
        .from("stores")
        .update({
            name,
            business_start_time: business_start_time || null,
            business_end_time: business_end_time || null,
            day_switch_time: day_switch_time || null,
            industry: industry || null,
            prefecture: prefecture || null,
            city: city || null,
            address_line1: address_line1 || null,
            address_line2: address_line2 || null,
            postal_code: postal_code || null,
            closed_days: closed_days.length > 0 ? closed_days : null,
            allow_join_requests,
            updated_at: new Date().toISOString(),
        })
        .eq("id", profile.store_id);

    revalidatePath("/app/settings/store");
    redirect("/app/settings/store");
}

export async function updateTheme(theme: string) {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        throw new Error("No profile found");
    }

    const { error } = await supabase
        .from("profiles")
        .update({ theme })
        .eq("id", appUser.current_profile_id);

    if (error) {
        console.error("Error updating theme:", error);
        throw new Error("Failed to update theme");
    }

    revalidatePath("/", "layout");
}

export async function getSettingsData() {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { redirect: "/login" };
    }

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
        .select("*, stores(*)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile || !currentProfile.store_id) {
        return { redirect: "/app/me" };
    }

    // Role check
    if (currentProfile.role !== "staff") {
        return { redirect: "/app/timecard" };
    }

    return { success: true };
}

export async function deleteStore() {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

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
        .select("store_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile?.store_id) {
        throw new Error("No store found");
    }

    // Permission check: only admin or staff can delete store
    if (!['admin', 'staff'].includes(profile.role)) {
        throw new Error(`権限がありません: 現在の役割は '${profile.role}' です`);
    }

    // Delete the store (CASCADE DELETE will handle profiles and related data)
    const { error } = await supabase
        .from("stores")
        .delete()
        .eq("id", profile.store_id);

    if (error) {
        console.error("Error deleting store:", error);
        throw new Error("店舗の削除に失敗しました");
    }

    // Update current_profile_id to null (CASCADE DELETE will handle this automatically with ON DELETE SET NULL)
    // But we do it explicitly here for immediate effect
    await supabase
        .from("users")
        .update({ current_profile_id: null })
        .eq("id", user.id);

    revalidatePath("/", "layout");
    redirect("/app/me");
}

export async function uploadStoreIcon(formData: FormData) {
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

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile?.store_id) throw new Error("No store");
    if (profile.role !== "staff") {
        throw new Error(`Unauthorized: Current role is '${profile.role}'`);
    }

    const file = formData.get("file") as File;
    if (!file) throw new Error("ファイルが選択されていません");

    const fileExt = file.name.split('.').pop();
    const fileName = `store-${profile.store_id}-${Date.now()}.${fileExt}`;
    const filePath = `store-icons/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

    if (uploadError) throw new Error(`アップロードに失敗しました: ${uploadError.message}`);

    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

    const { error: updateError } = await supabase
        .from("stores")
        .update({ icon_url: publicUrl })
        .eq("id", profile.store_id);

    if (updateError) throw new Error(`更新に失敗しました: ${updateError.message}`);

    revalidatePath("/app/settings/store");
    return { success: true, publicUrl };
}

export async function deleteStoreIcon() {
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

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile?.store_id) throw new Error("No store");
    if (profile.role !== "staff") {
        throw new Error(`Unauthorized: Current role is '${profile.role}'`);
    }

    // Get current icon url to delete file (optional)
    const { data: store } = await supabase
        .from("stores")
        .select("icon_url")
        .eq("id", profile.store_id)
        .single();

    if (store?.icon_url) {
        const url = new URL(store.icon_url);
        // Extract path after bucket name if possible, or just filename
        // Assuming standard supabase storage url structure
        const path = `store-icons/${url.pathname.split('/').pop()}`;
        await supabase.storage.from('avatars').remove([path]);
    }

    const { error } = await supabase
        .from("stores")
        .update({ icon_url: null })
        .eq("id", profile.store_id);

    if (error) throw new Error(`削除に失敗しました: ${error.message}`);

    revalidatePath("/app/settings/store");
    return { success: true };
}

export async function geocodeAddress(address: string) {
    "use server";

    console.log("Geocoding address:", address);
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&accept-language=ja`,
            {
                headers: {
                    "User-Agent": "Nightbase/1.0 (info@nightbase.jp)"
                }
            }
        );

        if (!response.ok) {
            console.error("Geocoding API error:", response.status, response.statusText);
            const text = await response.text();
            console.error("Response body:", text);
            return { error: "Geocoding failed" };
        }

        const data = await response.json();
        console.log("Geocoding result:", data);

        if (data && data.length > 0) {
            return {
                success: true,
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon)
            };
        }

        return { error: "Address not found" };
    } catch (error) {
        console.error("Geocoding error:", error);
        return { error: "Geocoding request failed" };
    }
}

export async function searchAddressByPostalCode(postalCode: string) {
    "use server";

    try {
        // Remove hyphens if present
        const cleanPostalCode = postalCode.replace(/-/g, "");

        const response = await fetch(
            `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanPostalCode}`,
            {
                method: 'GET',
            }
        );

        if (!response.ok) {
            return { error: "Failed to fetch address" };
        }

        const data = await response.json();

        if (data.status === 200 && data.results && data.results.length > 0) {
            const result = data.results[0];
            return {
                success: true,
                prefecture: result.address1, // 都道府県
                city: result.address2,       // 市区町村
                addressLine1: result.address3 // 町域
            };
        }

        return { error: "Address not found" };
    } catch (error) {
        console.error("Postal code search error:", error);
        return { error: "Request failed" };
    }
}

export async function updateSlipSettings(formData: FormData) {
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
        redirect("/app/me");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (profile.role !== "staff") {
        throw new Error(`Unauthorized: Current role is '${profile.role}'`);
    }

    const slip_rounding_enabled_raw = formData.get("slip_rounding_enabled");
    const slip_rounding_enabled = slip_rounding_enabled_raw === "on" || slip_rounding_enabled_raw === "true";
    const slip_rounding_method = formData.get("slip_rounding_method") as string || "round";
    const slip_rounding_unit_str = formData.get("slip_rounding_unit") as string;
    const slip_rounding_unit = slip_rounding_unit_str ? parseInt(slip_rounding_unit_str) : 10;

    // Validate rounding method (only if enabled)
    if (slip_rounding_enabled && !["round", "ceil", "floor"].includes(slip_rounding_method)) {
        throw new Error("Invalid rounding method");
    }

    // Validate rounding unit (only if enabled)
    if (slip_rounding_enabled && ![10, 100, 1000, 10000].includes(slip_rounding_unit)) {
        throw new Error("Invalid rounding unit");
    }

    const updateData: any = {
        slip_rounding_enabled,
        updated_at: new Date().toISOString(),
    };

    if (slip_rounding_enabled) {
        updateData.slip_rounding_method = slip_rounding_method;
        updateData.slip_rounding_unit = slip_rounding_unit;
    } else {
        updateData.slip_rounding_method = null;
        updateData.slip_rounding_unit = null;
    }

    console.log("Updating slip settings:", {
        store_id: profile.store_id,
        updateData,
    });

    const { data: updatedStore, error } = await supabase
        .from("stores")
        .update(updateData)
        .eq("id", profile.store_id)
        .select()
        .single();

    if (error) {
        console.error("Error updating slip settings:", error);
        console.error("Update data:", updateData);
        console.error("Store ID:", profile.store_id);
        throw new Error(`伝票設定の更新に失敗しました: ${error.message}`);
    }

    console.log("Successfully updated slip settings:", updatedStore);

    revalidatePath("/app/settings/slip");
    revalidatePath("/app/floor");
    revalidatePath("/app/slips");
}
