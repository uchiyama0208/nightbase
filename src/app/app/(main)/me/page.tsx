import { createServerClient } from "@/lib/supabaseServerClient";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Building2, Plus, User, LogOut, Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { switchProfile, signOut, getUserProfile } from "./actions";
import { ProfileClient } from "./profile-client";
import { DeleteAccountModal } from "./delete-account-modal";

export const metadata: Metadata = {
    title: "マイページ",
};

export default async function MyPage() {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Get current user details to know current_profile_id
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .single();

    // Fetch all profiles for this user with store details
    const { data: profiles } = await supabase
        .from("profiles")
        .select("*, stores(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    const currentProfileId = appUser?.current_profile_id;

    // Get user profile for settings
    const profile = await getUserProfile();

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="px-4 pt-6 pb-4">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">マイページ</h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        所属店舗の切り替えや設定を管理します。
                    </p>
                </div>

                {/* Profile Settings Section */}
                <ProfileClient
                    initialEmail={profile.email || ""}
                    initialName={profile.name}
                    identities={user.identities || []}
                    userId={user.id}
                    lineUserId={profile.lineUserId}
                />

                {/* Store Profiles Section */}
                <div className="mt-8">
                    <div className="px-4 pb-2">
                        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">所属店舗</h2>
                    </div>
                    <div className="bg-white dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700">
                        {profiles && profiles.length > 0 ? (
                            profiles.map((profile, index) => {
                                const store = profile.stores as any;
                                const isCurrent = profile.id === currentProfileId;
                                const isLast = index === profiles.length - 1;

                                return (
                                    <div key={profile.id}>
                                        <div className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 transition-colors">
                                            <div className={`p-2 rounded-lg ${isCurrent ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-100 dark:bg-gray-700"}`}>
                                                <Building2 className={`h-5 w-5 ${isCurrent ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`} />
                                            </div>
                                            <div className="ml-3 flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                                                        {store?.name || "不明な店舗"}
                                                    </h3>
                                                    {isCurrent && (
                                                        <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                        {profile.display_name}
                                                    </span>
                                                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex-shrink-0">
                                                        {profile.role === 'admin' ? '管理者' : profile.role === 'staff' ? 'スタッフ' : 'キャスト'}
                                                    </span>
                                                </div>
                                            </div>
                                            {!isCurrent && (
                                                <form action={switchProfile.bind(null, profile.id)} className="ml-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-transparent"
                                                    >
                                                        切り替え
                                                    </Button>
                                                </form>
                                            )}
                                        </div>
                                        {!isLast && <div className="ml-16 border-b border-gray-200 dark:border-gray-700" />}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="px-4 py-8 text-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400">所属店舗がありません</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Store Actions */}
                <div className="mt-8">
                    <div className="px-4 pb-2">
                        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">店舗管理</h2>
                    </div>
                    <div className="bg-white dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700">
                        <Link href="/app/me?mode=create" className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 transition-colors">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                <Plus className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="ml-3 flex-1">
                                <h3 className="text-base font-medium text-gray-900 dark:text-white">新規店舗を作成</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    新しい店舗を登録して管理を始めます
                                </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        </Link>

                        <div className="ml-16 border-b border-gray-200 dark:border-gray-700" />

                        <Link href="/app/me?mode=join" className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 transition-colors">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="ml-3 flex-1">
                                <h3 className="text-base font-medium text-gray-900 dark:text-white">店舗に参加</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    招待コードを使って既存の店舗に参加します
                                </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        </Link>
                    </div>
                </div>

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
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
