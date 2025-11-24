import { createServerClient } from "@/lib/supabaseServerClient";
import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage({
    searchParams,
}: {
    searchParams: Promise<{ mode?: string; access_token?: string; refresh_token?: string }>;
}) {
    const params = await searchParams;
    const mode = params.mode || "join";

    const supabase = await createServerClient();

    // If access_token is provided, set the session
    if (params.access_token && params.refresh_token) {
        const { error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
        });

        if (error) {
            console.error("Session error:", error);
            redirect("/signup");
        }
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/signup");
    }

    // Check if user already has a profile
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    let initialData = null;

    if (appUser?.current_profile_id) {
        // User already has a profile
        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", appUser.current_profile_id)
            .maybeSingle();

        if (profile?.store_id) {
            // User already has a store, redirect to dashboard
            redirect("/app/dashboard");
        }

        if (profile) {
            initialData = {
                display_name: profile.display_name,
                display_name_kana: profile.display_name_kana,
                real_name: profile.real_name,
                real_name_kana: profile.real_name_kana,
            };
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                <ProfileForm mode={mode} initialData={initialData} />
            </div>
        </div>
    );
}
