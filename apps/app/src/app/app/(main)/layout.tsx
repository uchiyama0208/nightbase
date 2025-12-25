import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppLayoutClient } from "./layout-client";
import { getAppData } from "../data-access";

export const metadata: Metadata = {
    title: {
        template: "%s | NightBase",
        default: "NightBase",
    },
};


export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, profile, storeFeatures } = await getAppData();

    if (!user) {
        redirect("/login");
    }

    // Check approval status
    // If profile exists but has no approved role (cast/staff), redirect to pending approval page
    // "guest" role means the user hasn't been approved yet
    if (profile && (!profile.role || profile.role === "guest")) {
        // User has a profile but no approved role yet - redirect to pending approval page
        redirect("/onboarding/pending-approval");
    }

    // Check for role permissions
    // Note: We removed the "No Permissions" screen here because it was blocking the onboarding flow.
    // Users without a role_id should be able to access the app to complete onboarding.
    // Permission checks should be done at the page/action level instead.
    let hasPermissions = false;
    if (profile?.role_id) {
        hasPermissions = true;
    } else if (profile?.role === 'staff') {
        // Legacy/Owner fallback
        hasPermissions = true;
    }

    // Removed the blocking "No Permissions" screen to allow onboarding flow

    const userRole = profile?.role || "guest";
    const profileName = profile?.display_name || undefined;
    const avatarUrl = profile?.avatar_url
        ? `${profile.avatar_url}${profile.avatar_url.includes("?") ? "&" : "?"}t=${Date.now()}`
        : undefined;
    const store = profile?.stores;
    const storeName = store?.name;

    return (
        <AppLayoutClient
            userRole={userRole}
            profileName={profileName}
            avatarUrl={avatarUrl}
            storeName={storeName}
            storeFeatures={storeFeatures}
            hideSidebar={!profile}
        >
            {children}
        </AppLayoutClient>
    );
}
