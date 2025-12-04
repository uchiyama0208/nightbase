import { createServerClient } from "@/lib/supabaseServerClient";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { User, Settings } from "lucide-react";
import { StoreActionsModal } from "./store-actions-modal";
import { StoreSelectorModal } from "./store-selector-modal";
import { AttendanceCalendar } from "./attendance-calendar";

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

    // Get current user details to know current_profile_id, avatar, and display_name
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id, avatar_url, display_name")
        .eq("id", user.id)
        .single();

    // Fetch all profiles for this user with store details
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, role, stores(id, name, icon_url)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    const currentProfileId = appUser?.current_profile_id;

    // If user has no profiles, redirect to store creation/join page
    if (!profiles || profiles.length === 0) {
        redirect("/onboarding/choice");
    }

    // Get current profile
    const currentProfile = profiles.find(p => p.id === currentProfileId) || profiles[0];
    const storesData = currentProfile?.stores as unknown;
    const currentStore = (Array.isArray(storesData) ? storesData[0] : storesData) as { id: string; name: string; icon_url?: string | null } | null;

    // Fetch time cards for all user's profiles
    const profileIds = profiles.map(p => p.id);
    const { data: timeCardsRaw } = await supabase
        .from("time_cards")
        .select("id, work_date, clock_in, clock_out, user_id")
        .in("user_id", profileIds)
        .order("work_date", { ascending: false });

    // Map time cards with store info
    const timeCards = (timeCardsRaw || []).map(tc => {
        const profile = profiles.find(p => p.id === tc.user_id);
        const storeData = profile?.stores as unknown;
        const store = (Array.isArray(storeData) ? storeData[0] : storeData) as { id: string; name: string; icon_url?: string | null } | null;
        return {
            id: tc.id,
            work_date: tc.work_date,
            clock_in: tc.clock_in,
            clock_out: tc.clock_out,
            store_name: store?.name || "不明",
            store_icon_url: store?.icon_url || null,
        };
    });

    return (
        <div className="max-w-2xl mx-auto -mt-4 -mx-4 sm:mx-auto sm:mt-0">
            {/* Profile Header - Twitter style */}
            {(() => {
                // Use LINE data (users table) if available, otherwise fall back to profile data
                const avatarUrl = appUser?.avatar_url || currentProfile?.avatar_url;
                const displayName = appUser?.display_name || currentProfile?.display_name;

                return (
                    <div className="px-4 pt-6 pb-4">
                        <div className="flex items-center gap-4">
                            {avatarUrl ? (
                                <Image
                                    src={avatarUrl}
                                    alt={displayName || ""}
                                    width={64}
                                    height={64}
                                    className="rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    <User className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                                    {displayName || "名前未設定"}
                                </h1>
                            </div>
                            <Link
                                href="/app/me/settings"
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </Link>
                        </div>
                        {/* Store Selector */}
                        <div className="mt-3">
                            <StoreSelectorModal
                                profiles={profiles.map(p => {
                                    const s = p.stores as unknown;
                                    const store = (Array.isArray(s) ? s[0] : s) as { id: string; name: string; icon_url?: string | null } | null;
                                    return {
                                        id: p.id,
                                        display_name: p.display_name,
                                        role: p.role,
                                        stores: store,
                                    };
                                })}
                                currentProfileId={currentProfileId || null}
                                currentStoreName={currentStore?.name || null}
                                currentStoreIcon={currentStore?.icon_url || null}
                            />
                        </div>
                    </div>
                );
            })()}

            {/* Attendance Calendar */}
            <div className="px-4 mt-4">
                <AttendanceCalendar timeCards={timeCards} />
            </div>

            {/* Store Actions Modal */}
            <Suspense fallback={null}>
                <StoreActionsModal />
            </Suspense>
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
