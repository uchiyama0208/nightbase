import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShoppingList } from "./shopping-list";
import { getShoppingPageData } from "./actions";
import { getAppDataWithPermissionCheck } from "../../data-access";

export const metadata: Metadata = {
    title: "買い出しリスト",
};

function ShoppingSkeleton() {
    return (
        <div className="container mx-auto py-6 space-y-6 animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
    );
}

export default async function ShoppingPage() {
    const { user, profile, hasAccess, canEdit } = await getAppDataWithPermissionCheck("shopping", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect("/app/dashboard?denied=" + encodeURIComponent("買い出しページへのアクセス権限がありません"));
    }

    const result = await getShoppingPageData();

    // Handle redirects
    if ('redirect' in result && result.redirect) {
        redirect(result.redirect);
    }

    if (!('data' in result) || !result.data) {
        redirect("/app/me");
    }

    const { shoppingList, lowStockMenus } = result.data;

    return (
        <Suspense fallback={<ShoppingSkeleton />}>
            <ShoppingList
                initialItems={shoppingList}
                lowStockMenus={lowStockMenus}
                canEdit={canEdit}
            />
        </Suspense>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
