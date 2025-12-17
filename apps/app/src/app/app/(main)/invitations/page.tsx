import { Suspense } from "react";
import { redirect } from "next/navigation";
import { InvitationList } from "./invitation-list";
import { getInvitationsData } from "./actions";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl, hasPagePermission } from "../../data-access";

function InvitationsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
    );
}

export default async function InvitationsPage() {
    const { user, profile, hasAccess, canEdit, permissions } = await getAppDataWithPermissionCheck("invitations", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("invitations"));
    }

    const response = await getInvitationsData();

    if (response.redirect) {
        redirect(response.redirect);
    }

    if (!response.data) {
        return null;
    }

    const { invitations, uninvitedProfiles, roles, joinRequests, storeSettings } = response.data;

    // 各ページの権限をチェック
    const pagePermissions = {
        bottles: hasPagePermission("bottles", "view", profile, permissions ?? null),
        resumes: hasPagePermission("resumes", "view", profile, permissions ?? null),
        salarySystems: hasPagePermission("salary-systems", "view", profile, permissions ?? null),
        attendance: hasPagePermission("attendance", "view", profile, permissions ?? null),
        personalInfo: hasPagePermission("users-personal-info", "view", profile, permissions ?? null),
    };

    return (
        <div className="space-y-6">
            <InvitationList
                initialInvitations={invitations}
                uninvitedProfiles={uninvitedProfiles}
                roles={roles}
                initialJoinRequests={joinRequests}
                initialStoreSettings={storeSettings}
                canEdit={canEdit}
                pagePermissions={pagePermissions}
            />
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
