import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SeatsClient } from "./seats-client";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "../../data-access";

export const metadata: Metadata = {
    title: "席エディター",
};

export default async function SeatsPage() {
    const { user, profile, hasAccess, canEdit } = await getAppDataWithPermissionCheck("seats", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("seats"));
    }

    return <SeatsClient canEdit={canEdit} />;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
