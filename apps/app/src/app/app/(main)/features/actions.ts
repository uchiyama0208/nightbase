"use server";

import { getAuthContext, getAuthContextForPage } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

// All feature keys that can be toggled
export const FEATURE_KEYS = [
    // Shift
    "show_attendance",
    "show_pickup",
    "show_timecard",
    "show_shifts",
    "show_my_shifts",
    // User
    "show_users",
    "show_resumes",
    "show_invitations",
    "show_roles",
    // Floor
    "show_floor",
    "show_orders",
    "show_queue",
    "show_reservations",
    "show_seats",
    "show_slips",
    "show_menus",
    "show_bottles",
    "show_shopping",
    // Store
    "show_sales",
    "show_payroll",
    "show_ranking",
    "show_pricing_systems",
    "show_salary_systems",
    // Community
    "show_board",
    "show_sns",
    "show_ai_create",
    "show_services",
] as const;

export type FeatureKey = typeof FEATURE_KEYS[number];

/**
 * Get feature settings page data
 */
export async function getFeaturesPageData() {
    const authResult = await getAuthContextForPage({ requireStaff: true });

    if ("redirect" in authResult) {
        return { redirect: authResult.redirect };
    }

    const { context } = authResult;
    const supabase = context.supabase;

    // Get store settings
    const { data: storeSettings } = await supabase
        .from("store_settings")
        .select("*")
        .eq("store_id", context.storeId)
        .single();

    // Build feature settings object with defaults (true if not set)
    const featureSettings: Record<string, boolean> = {};
    for (const key of FEATURE_KEYS) {
        featureSettings[key] = storeSettings?.[key] ?? true;
    }

    return {
        data: {
            featureSettings,
        },
    };
}

/**
 * Update feature settings
 */
export async function updateFeatureSettings(settings: Record<string, boolean>) {
    const { supabase, storeId } = await getAuthContext({ requireStaff: true });

    // Build update payload with only valid feature keys
    const payload: Record<string, boolean> = {};
    for (const key of FEATURE_KEYS) {
        if (key in settings) {
            payload[key] = settings[key];
        }
    }

    const { error } = await supabase
        .from("store_settings")
        .update(payload)
        .eq("store_id", storeId);

    if (error) {
        console.error("Error updating feature settings:", error);
        throw new Error("Failed to update feature settings");
    }

    // Revalidate all potentially affected paths
    revalidatePath("/app/settings");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/features");
    revalidatePath("/app/(main)", "layout");
}
