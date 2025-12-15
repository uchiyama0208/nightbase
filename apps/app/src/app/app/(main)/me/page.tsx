import { createServerClient } from "@/lib/supabaseServerClient";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StoreActionsModal } from "./store-actions-modal";
import { MeContent } from "./me-content";

export const metadata: Metadata = {
    title: "マイページ",
};

export default async function MyPage() {
    const supabase = await createServerClient() as any;
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

    // Fetch approved shift submissions for all user's profiles
    const { data: shiftsRaw } = await supabase
        .from("shift_submissions")
        .select(`
            id,
            availability,
            status,
            approved_start_time,
            approved_end_time,
            profile_id,
            shift_request_dates(target_date, shift_requests(store_id))
        `)
        .in("profile_id", profileIds)
        .eq("status", "approved")
        .eq("availability", "available");

    // Map shifts with store info
    const scheduledShifts = (shiftsRaw || []).map(shift => {
        const profile = profiles.find(p => p.id === shift.profile_id);
        const storeData = profile?.stores as unknown;
        const store = (Array.isArray(storeData) ? storeData[0] : storeData) as { id: string; name: string; icon_url?: string | null } | null;
        const dateInfo = shift.shift_request_dates as any;
        return {
            id: shift.id,
            target_date: dateInfo?.target_date || null,
            start_time: shift.approved_start_time,
            end_time: shift.approved_end_time,
            store_name: store?.name || "不明",
            store_icon_url: store?.icon_url || null,
        };
    }).filter(s => s.target_date);

    // Use LINE data (users table) if available, otherwise fall back to profile data
    const avatarUrl = appUser?.avatar_url || currentProfile?.avatar_url;
    const displayName = appUser?.display_name || currentProfile?.display_name;

    // Map profiles for client component
    const mappedProfiles = profiles.map(p => {
        const s = p.stores as unknown;
        const store = (Array.isArray(s) ? s[0] : s) as { id: string; name: string; icon_url?: string | null } | null;
        return {
            id: p.id,
            display_name: p.display_name,
            role: p.role,
            stores: store,
        };
    });

    return (
        <>
            <MeContent
                avatarUrl={avatarUrl || null}
                displayName={displayName || null}
                profiles={mappedProfiles}
                currentProfileId={currentProfileId || null}
                currentStore={currentStore}
                timeCards={timeCards}
                scheduledShifts={scheduledShifts}
            />

            {/* Store Actions Modal */}
            <Suspense fallback={null}>
                <StoreActionsModal />
            </Suspense>
        </>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
