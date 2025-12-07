import { createServerClient } from "@/lib/supabaseServerClient";
import { redirect } from "next/navigation";
import { TimecardSettingsForm } from "./timecard-settings-form";
import { BackButton } from "@/components/back-button";

export default async function TimecardSettingsPage() {
    const supabase = await createServerClient() as any;
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
        .select("*, stores(*)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile) {
        redirect("/app/me");
    }

    const store = profile.stores as any;

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center space-x-4">
                <BackButton />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">タイムカード設定</h1>
            </div>

            <TimecardSettingsForm store={store} />
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
