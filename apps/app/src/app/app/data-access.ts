import { createServerClient } from "@/lib/supabaseServerClient";
import type { Store } from "@/types/common";

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
        .select("*, stores(*)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    // Type assertion for the joined data
    const profile = profileData as ProfileWithStoreData | null;

    const theme = (profile?.theme as "light" | "dark") || "light";
    const storeId = profile?.store_id;

    return { user, profile, storeId, theme };
}
