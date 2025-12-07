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
    const { user, profile } = await getAppData();

    if (!user) {
        redirect("/login");
    }

    // Check approval status
    if (profile) {
        const approvalStatus = profile.approval_status || "approved";

        if (approvalStatus === "pending" || approvalStatus === "rejected") {
            // Redirect to pending approval page
            redirect("/onboarding/pending-approval");
        }
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
    const storeFeatures = store
        ? {
            show_dashboard: store.show_dashboard ?? true,
            show_attendance: store.show_attendance ?? true,
            show_timecard: store.show_timecard ?? true,
            show_users: store.show_users ?? true,
            show_roles: store.show_roles ?? true,
        }
        : undefined;

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
