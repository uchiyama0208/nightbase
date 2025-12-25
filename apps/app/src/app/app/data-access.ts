import { createServerClient } from "@/lib/supabaseServerClient";
import type { Store } from "@/types/common";
import { PAGE_LABELS, type PageKey, type PermissionLevel } from "./(main)/settings/roles/constants";

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

// Feature visibility settings from store_settings
export interface StoreFeatures {
    show_attendance: boolean;
    show_pickup: boolean;
    show_timecard: boolean;
    show_shifts: boolean;
    show_my_shifts: boolean;
    show_users: boolean;
    show_resumes: boolean;
    show_invitations: boolean;
    show_roles: boolean;
    show_floor: boolean;
    show_orders: boolean;
    show_queue: boolean;
    show_reservations: boolean;
    show_seats: boolean;
    show_slips: boolean;
    show_menus: boolean;
    show_bottles: boolean;
    show_shopping: boolean;
    show_sales: boolean;
    show_payroll: boolean;
    show_ranking: boolean;
    show_pricing_systems: boolean;
    show_salary_systems: boolean;
    show_board: boolean;
    show_sns: boolean;
    show_ai_create: boolean;
    show_services: boolean;
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

    // Fetch store_settings for feature visibility
    let storeFeatures: StoreFeatures | null = null;
    if (storeId) {
        const { data: storeSettings } = await supabase
            .from("store_settings")
            .select(`
                show_attendance, show_pickup, show_timecard, show_shifts, show_my_shifts,
                show_users, show_resumes, show_invitations, show_roles,
                show_floor, show_orders, show_queue, show_reservations, show_seats, show_slips, show_menus, show_bottles, show_shopping,
                show_sales, show_payroll, show_ranking, show_pricing_systems, show_salary_systems,
                show_board, show_sns, show_ai_create, show_services
            `)
            .eq("store_id", storeId)
            .maybeSingle();

        if (storeSettings) {
            storeFeatures = {
                show_attendance: storeSettings.show_attendance ?? true,
                show_pickup: storeSettings.show_pickup ?? true,
                show_timecard: storeSettings.show_timecard ?? true,
                show_shifts: storeSettings.show_shifts ?? true,
                show_my_shifts: storeSettings.show_my_shifts ?? true,
                show_users: storeSettings.show_users ?? true,
                show_resumes: storeSettings.show_resumes ?? true,
                show_invitations: storeSettings.show_invitations ?? true,
                show_roles: storeSettings.show_roles ?? true,
                show_floor: storeSettings.show_floor ?? true,
                show_orders: storeSettings.show_orders ?? true,
                show_queue: storeSettings.show_queue ?? true,
                show_reservations: storeSettings.show_reservations ?? true,
                show_seats: storeSettings.show_seats ?? true,
                show_slips: storeSettings.show_slips ?? true,
                show_menus: storeSettings.show_menus ?? true,
                show_bottles: storeSettings.show_bottles ?? true,
                show_shopping: storeSettings.show_shopping ?? true,
                show_sales: storeSettings.show_sales ?? true,
                show_payroll: storeSettings.show_payroll ?? true,
                show_ranking: storeSettings.show_ranking ?? true,
                show_pricing_systems: storeSettings.show_pricing_systems ?? true,
                show_salary_systems: storeSettings.show_salary_systems ?? true,
                show_board: storeSettings.show_board ?? true,
                show_sns: storeSettings.show_sns ?? true,
                show_ai_create: storeSettings.show_ai_create ?? true,
                show_services: storeSettings.show_services ?? true,
            };
        }
    }

    return { user, profile, storeId, theme, permissions, storeFeatures };
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
 * @param userRole - The user's role (optional, used for cast-specific redirect)
 * @returns The redirect URL with encoded denied message
 */
export function getAccessDeniedRedirectUrl(pageKey: PageKey, userRole?: string): string {
    const pageName = PAGE_LABELS[pageKey] || pageKey;
    const message = `${pageName}ページへのアクセス権限がありません`;

    // キャストはタイムカードにリダイレクト
    if (userRole === "cast") {
        return `/app/timecard`;
    }

    return `/app/dashboard?denied=${encodeURIComponent(message)}`;
}

/**
 * キャストがアクセス可能なページかどうかをチェック
 * キャストは: timecard, my-shifts, ranking, board, me のみアクセス可能
 */
export function isCastAllowedPage(pathname: string): boolean {
    const allowedPaths = [
        "/app/timecard",
        "/app/my-shifts",
        "/app/ranking",
        "/app/board",
        "/app/me",
    ];
    return allowedPaths.some(path => pathname.startsWith(path));
}
