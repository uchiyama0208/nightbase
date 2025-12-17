import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SlipsClient } from "./slips-client";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "../../data-access";

export const metadata: Metadata = {
    title: "伝票",
};

export default async function SlipsPage() {
    const { user, profile, hasAccess, canEdit } = await getAppDataWithPermissionCheck("slips", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("slips"));
    }

    return <SlipsClient canEdit={canEdit} />;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
