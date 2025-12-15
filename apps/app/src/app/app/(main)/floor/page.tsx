import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FloorClient } from "./floor-client";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "../../data-access";

export const metadata: Metadata = {
    title: "フロア管理",
};

export default async function FloorPage() {
    const { user, profile, hasAccess } = await getAppDataWithPermissionCheck("floor", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("floor"));
    }

    return <FloorClient />;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
