import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SalesClient } from "./sales-client";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "../../data-access";

export const metadata: Metadata = {
    title: "売上",
};

export default async function SalesPage() {
    const { user, profile, hasAccess } = await getAppDataWithPermissionCheck("sales", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("sales"));
    }

    return <SalesClient />;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
