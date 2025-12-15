import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RankingClient } from "./ranking-client";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "../../data-access";

export const metadata: Metadata = {
    title: "ランキング",
};

export default async function RankingPage() {
    const { user, profile, hasAccess } = await getAppDataWithPermissionCheck("ranking", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("ranking"));
    }

    return <RankingClient />;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
