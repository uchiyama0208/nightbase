import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createServerClient } from "@/lib/supabaseServerClient";
import { FloorSettingsForm } from "./floor-settings-form";

export const metadata: Metadata = {
    title: "フロア設定",
};

async function checkSettingsAccess() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile?.store_id) {
        redirect("/app/me");
    }

    if (currentProfile.role !== "staff") {
        redirect("/app/dashboard");
    }

    return currentProfile.store_id;
}

export default async function FloorSettingsPage() {
    const storeId = await checkSettingsAccess();
    const supabase = await createServerClient();

    const { data: store } = await supabase
        .from("stores")
        .select("*")
        .eq("id", storeId)
        .single();

    if (!store) {
        redirect("/app/settings");
    }

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center gap-4">
                <Link
                    href="/app/settings"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    フロア設定
                </h1>
            </div>

            <FloorSettingsForm store={store} />
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
