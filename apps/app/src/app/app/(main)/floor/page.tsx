import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FloorClient } from "./floor-client";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl, hasPagePermission } from "../../data-access";

export const metadata: Metadata = {
    title: "フロア管理",
};

export default async function FloorPage() {
    const { user, profile, hasAccess, canEdit, permissions } = await getAppDataWithPermissionCheck("floor", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("floor"));
    }

    // 各ページの権限をチェック
    const pagePermissions = {
        bottles: hasPagePermission("bottles", "view", profile, permissions ?? null),
        resumes: hasPagePermission("resumes", "view", profile, permissions ?? null),
        salarySystems: hasPagePermission("salary-systems", "view", profile, permissions ?? null),
        attendance: hasPagePermission("attendance", "view", profile, permissions ?? null),
        personalInfo: hasPagePermission("users-personal-info", "view", profile, permissions ?? null),
    };

    return <FloorClient canEdit={canEdit} pagePermissions={pagePermissions} />;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
