import { createServerClient } from "@/lib/supabaseServerClient";

export async function getAppData() {
    const supabase = await createServerClient();

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

    const { data: profile } = await supabase
        .from("profiles")
        .select("*, stores(*)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    const theme = (profile?.theme as "light" | "dark") || "light";
    const storeId = profile?.store_id;

    return { user, profile, storeId, theme };
}
