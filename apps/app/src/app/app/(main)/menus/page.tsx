import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MenuList } from "./menu-list";
import { getMenusData, getStoreLocationInfo } from "./actions";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "../../data-access";

export const metadata: Metadata = {
    title: "メニュー管理",
};

function MenusSkeleton() {
    return (
        <div className="container mx-auto py-6 space-y-6 animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
    );
}

export default async function MenusPage() {
    const { user, profile, hasAccess, canEdit } = await getAppDataWithPermissionCheck("menus", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("menus"));
    }

    const result = await getMenusData();

    // Handle redirects
    if ('redirect' in result && result.redirect) {
        redirect(result.redirect);
    }

    if (!('data' in result) || !result.data) {
        redirect("/app/me");
    }

    const { menus, categories } = result.data;
    const storeInfo = await getStoreLocationInfo();

    return (
        <Suspense fallback={<MenusSkeleton />}>
            <MenuList initialMenus={menus} categories={categories} canEdit={canEdit} storeInfo={storeInfo} />
        </Suspense>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
