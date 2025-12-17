import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import { BottleList } from "./bottle-list";
import { getMenus } from "../menus/actions";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl, hasPagePermission } from "../../data-access";

export const metadata: Metadata = {
    title: "ボトルキープ管理",
};

async function getBottlesPageData() {
    const { user, profile, hasAccess, canEdit, permissions } = await getAppDataWithPermissionCheck("bottles", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("bottles"));
    }

    const supabase = await createServerClient() as any;

    // Fetch menus for bottle selection
    const menus = await getMenus();

    // Fetch all profiles in this store (for guest selection) - 在籍中・体入のみ
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, role, status")
        .eq("store_id", profile.store_id)
        .in("status", ["在籍中", "体入"])
        .order("display_name");

    // 各ページの権限をチェック
    const pagePermissions = {
        bottles: hasPagePermission("bottles", "view", profile, permissions ?? null),
        resumes: hasPagePermission("resumes", "view", profile, permissions ?? null),
        salarySystems: hasPagePermission("salary-systems", "view", profile, permissions ?? null),
        attendance: hasPagePermission("attendance", "view", profile, permissions ?? null),
        personalInfo: hasPagePermission("users-personal-info", "view", profile, permissions ?? null),
    };

    return {
        storeId: profile.store_id,
        menus: menus || [],
        profiles: profiles || [],
        canEdit,
        pagePermissions,
    };
}

function BottlesSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
    );
}

export default async function BottlesPage() {
    const data = await getBottlesPageData();

    return (
        <Suspense fallback={<BottlesSkeleton />}>
            <BottleList
                storeId={data.storeId}
                menus={data.menus}
                profiles={data.profiles}
                canEdit={data.canEdit}
                pagePermissions={data.pagePermissions}
            />
        </Suspense>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
