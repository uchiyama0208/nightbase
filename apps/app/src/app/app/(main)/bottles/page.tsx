import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import { BottleList } from "./bottle-list";
import { getMenus } from "../menus/actions";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl } from "../../data-access";

export const metadata: Metadata = {
    title: "ボトルキープ管理",
};

async function getBottlesPageData() {
    const { user, profile, hasAccess } = await getAppDataWithPermissionCheck("bottles", "view");

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

    // Fetch all profiles in this store (for guest selection)
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, role")
        .eq("store_id", profile.store_id)
        .order("display_name");

    return {
        storeId: profile.store_id,
        menus: menus || [],
        profiles: profiles || [],
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
            />
        </Suspense>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
