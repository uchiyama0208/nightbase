import { createServerClient } from "@/lib/supabaseServerClient";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, LogOut } from "lucide-react";
import { getUserProfile, signOut } from "../actions";
import { ProfileClient } from "../profile-client";
import { DeleteAccountModal } from "../delete-account-modal";

export const metadata: Metadata = {
    title: "設定",
};

export default async function SettingsPage() {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Get user profile for settings
    const profile = await getUserProfile();

    return (
        <div className="max-w-2xl mx-auto -mt-4 -mx-4 sm:mx-auto sm:mt-0">
            {/* Header with back button */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-4">
                <Link
                    href="/app/me"
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">設定</h1>
            </div>

            {/* Account Settings Section */}
            <ProfileClient
                initialEmail={profile.email || ""}
                initialName={profile.name}
                identities={user.identities || []}
                userId={user.id}
                lineUserId={profile.lineUserId}
            />

            {/* Logout */}
            <div className="mt-8">
                <div className="bg-white dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700">
                    <form action={signOut}>
                        <button
                            type="submit"
                            className="w-full flex items-center justify-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                        >
                            <LogOut className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                            <span className="text-base font-medium text-red-600 dark:text-red-400">ログアウト</span>
                        </button>
                    </form>
                </div>
            </div>

            {/* Delete Account - At the very bottom */}
            <div className="mt-8 mb-8">
                <DeleteAccountModal />
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
