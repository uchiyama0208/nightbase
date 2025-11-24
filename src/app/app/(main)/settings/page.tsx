import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Store, Clock, ChevronRight, Upload } from "lucide-react";
import { createServerClient } from "@/lib/supabaseServerClient";
import { DeleteStoreModal } from "./delete-store-modal";

export const metadata: Metadata = {
    title: "設定",
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

    return true;
}

export default async function SettingsPage() {
    await checkSettingsAccess();

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">設定</h1>

            <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                    <Link href="/app/settings/store" className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-center space-x-4">
                            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-md">
                                <Store className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">店舗情報</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    </Link>

                    <Link href="/app/settings/timecard" className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-center space-x-4">
                            <div className="bg-green-100 dark:bg-green-900 p-2 rounded-md">
                                <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">タイムカード設定</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    </Link>

                    <Link href="/app/settings/import" className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-center space-x-4">
                            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-md">
                                <Upload className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">データインポート（CSV）</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    </Link>

                    <DeleteStoreModal />
                </div>
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
