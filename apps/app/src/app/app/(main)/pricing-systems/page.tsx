import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PricingSystemsClient } from "./pricing-systems-client";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "../../data-access";

export const metadata: Metadata = {
    title: "料金システム",
};

export default async function PricingSystemsPage() {
    const { user, profile, hasAccess, canEdit } = await getAppDataWithPermissionCheck("pricing-systems", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("pricing-systems"));
    }

    return <PricingSystemsClient canEdit={canEdit} />;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
