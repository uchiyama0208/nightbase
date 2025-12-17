import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRolesPageData } from "./actions";
import { RolesPageClient } from "./roles-client";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "../../data-access";

export const metadata: Metadata = {
    title: "権限",
};

function RolesSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
    );
}

export default async function RolesPage() {
    const { user, profile, hasAccess, canEdit } = await getAppDataWithPermissionCheck("roles", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("roles"));
    }

    const result = await getRolesPageData();

    if ("redirect" in result && result.redirect) {
        redirect(result.redirect);
    }

    if (!("data" in result) || !result.data) {
        redirect("/app/me");
    }

    const { roles, profiles, currentProfileId, currentRole } = result.data;

    return (
        <Suspense fallback={<RolesSkeleton />}>
            <RolesPageClient
                roles={roles}
                profiles={profiles}
                currentProfileId={currentProfileId}
                currentRole={currentRole}
                canEdit={canEdit}
            />
        </Suspense>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
