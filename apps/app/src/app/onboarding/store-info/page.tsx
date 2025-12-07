import { createServerClient } from "@/lib/supabaseServerClient";
import { redirect } from "next/navigation";
import { StoreInfoForm } from "./store-info-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function StoreInfoPage() {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/signup");
    }

    // Check if user already has a profile with a store
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (appUser?.current_profile_id) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("store_id")
            .eq("id", appUser.current_profile_id)
            .maybeSingle();

        if (profile?.store_id) {
            // User already has a store, redirect to dashboard
            redirect("/app/dashboard");
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-3xl w-full space-y-6">
                <div className="flex items-center space-x-4">
                    <Link
                        href="/onboarding/profile?mode=create"
                        className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        店舗情報の入力
                    </h1>
                </div>
                <StoreInfoForm />
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
