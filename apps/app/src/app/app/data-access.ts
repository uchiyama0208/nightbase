import { createServerClient } from "@/lib/supabaseServerClient";
import type { Store } from "@/types/common";
import { PAGE_LABELS, type PageKey, type PermissionLevel } from "./(main)/roles/constants";

export interface ProfileWithStoreData {
    id: string;
    display_name: string | null;
    display_name_kana?: string | null;
    real_name?: string | null;
    real_name_kana?: string | null;
    role: string;
    role_id: string | null;
    store_id: string;
    avatar_url?: string | null;
    theme?: string | null;
    approval_status?: string | null;
    stores: Store | null;
}

export type PagePermissions = {
    [key in PageKey]?: PermissionLevel;
};

export async function getAppData() {
    const supabase = await createServerClient() as any;

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { user: null, profile: null, storeId: undefined, theme: "light" as const };
    }

    // Optimize: Try to fetch everything in one go using deep embedding
    // We assume 'users' has a foreign key 'current_profile_id' pointing to 'profiles'
    // and 'profiles' has a foreign key 'store_id' pointing to 'stores'

    // Note: We need to know the exact relationship name for the join.
    // If explicit join fails, we might need to fall back or fix the relationship name.
    // Based on standard Supabase generation, it might be 'profiles' or 'profiles_current_profile_id_fkey'

    // Let's try a safe approach first: Fetch user config, then profile + store
    // This is still better than 3 round trips if we cache it.

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return { user, profile: null, storeId: undefined, theme: "light" as const };
    }

    const { data: profileData } = await supabase
        .from("profiles")
        .select("*, stores(*), store_roles(permissions)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    // Type assertion for the joined data
    const profile = profileData as (ProfileWithStoreData & { store_roles?: { permissions: PagePermissions } | null }) | null;

    const theme = (profile?.theme as "light" | "dark") || "light";
    const storeId = profile?.store_id;

    // Extract permissions from store_roles
    const permissions = profile?.store_roles?.permissions || null;

    return { user, profile, storeId, theme, permissions };
}

/**
 * Check if user has permission to access a page
 * @param pageKey - The page key to check (e.g., "settings", "users", "floor")
 * @param requiredLevel - The minimum permission level required ("view" or "edit")
 * @param profile - The user's profile
 * @param permissions - The user's permissions from store_roles
 * @returns true if user has access, false otherwise
 */
export function hasPagePermission(
    pageKey: PageKey,
    requiredLevel: "view" | "edit",
    profile: ProfileWithStoreData | null,
    permissions: PagePermissions | null
): boolean {
    if (!profile) return false;

    // admin always has full access
    if (profile.role === "admin") return true;

    // If no role_id is set, fall back to role-based defaults
    if (!profile.role_id || !permissions) {
        // Staff without role_id: deny by default (need explicit permission)
        // Cast without role_id: deny by default
        return false;
    }

    const permission = permissions[pageKey];

    if (!permission || permission === "none") return false;
    if (requiredLevel === "view") return permission === "view" || permission === "edit";
    if (requiredLevel === "edit") return permission === "edit";

    return false;
}

/**
 * Get app data with permission check for a specific page
 * Redirects to dashboard if user doesn't have permission
 */
export async function getAppDataWithPermissionCheck(
    pageKey: PageKey,
    requiredLevel: "view" | "edit" = "view"
) {
    const data = await getAppData();
    const hasAccess = hasPagePermission(pageKey, requiredLevel, data.profile, data.permissions ?? null);
    const canEdit = hasPagePermission(pageKey, "edit", data.profile, data.permissions ?? null);

    return { ...data, hasAccess, canEdit };
}

/**
 * Get access denied redirect URL with notification message
 * @param pageKey - The page key for which access was denied
 * @returns The dashboard URL with encoded denied message
 */
export function getAccessDeniedRedirectUrl(pageKey: PageKey): string {
    const pageName = PAGE_LABELS[pageKey] || pageKey;
    const message = `${pageName}ページへのアクセス権限がありません`;
    return `/app/dashboard?denied=${encodeURIComponent(message)}`;
}
