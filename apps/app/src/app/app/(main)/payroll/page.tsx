import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PayrollClient } from "./payroll-client";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "../../data-access";

export const metadata: Metadata = {
    title: "給与",
};

export default async function PayrollPage() {
    const { user, profile, hasAccess } = await getAppDataWithPermissionCheck("payroll", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("payroll"));
    }

    return <PayrollClient />;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
