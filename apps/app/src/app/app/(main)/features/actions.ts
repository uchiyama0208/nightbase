"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

export async function updateSingleFeature(feature: string, value: boolean) {
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
        .update({ [feature]: value })
        .eq("id", profile.store_id);

    if (error) {
        console.error("Error updating feature setting:", error);
        throw new Error("Failed to update feature setting");
    }

    revalidatePath("/app/(main)", "layout");
}

export async function getFeaturesData() {
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

    const { data: profile } = await supabase
        .from("profiles")
        .select("*, stores(*)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile || !profile.store_id) {
        return { redirect: "/app/me" };
    }

    if (profile.role !== "staff") {
        return { redirect: "/app/timecard" };
    }

    const store = profile.stores as any;

    const initialFlags = {
        show_dashboard: store?.show_dashboard ?? true,
        show_attendance: store?.show_attendance ?? true,
        show_timecard: store?.show_timecard ?? true,
        show_users: store?.show_users ?? true,
        show_roles: store?.show_roles ?? true,
    };

    return {
        data: {
            initialFlags,
        }
    };
}
