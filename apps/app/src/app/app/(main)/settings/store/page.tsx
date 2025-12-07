import { createServerClient } from "@/lib/supabaseServerClient";
import { redirect } from "next/navigation";
import { StoreSettingsForm } from "./store-settings-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function StoreSettingsPage() {
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
                <Link
                    href="/app/settings"
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">店舗情報</h1>
            </div>

            <StoreSettingsForm store={store} />
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
