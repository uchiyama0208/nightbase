import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import { BottleList } from "./bottle-list";
import { getMenus } from "../menus/actions";

export const metadata: Metadata = {
    title: "ボトルキープ管理",
};

async function getBottlesPageData() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        redirect("/app/me");
    }

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile?.store_id) {
        redirect("/app/me");
    }

    // Fetch menus for bottle selection
    const menus = await getMenus();

    // Fetch all profiles in this store (for guest selection)
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, role")
        .eq("store_id", currentProfile.store_id)
        .order("display_name");

    return {
        storeId: currentProfile.store_id,
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
        <div className="space-y-4">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    ボトルキープ管理
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    お客様のボトルキープを管理します。
                </p>
            </div>

            <Suspense fallback={<BottlesSkeleton />}>
                <BottleList
                    storeId={data.storeId}
                    menus={data.menus}
                    profiles={data.profiles}
                />
            </Suspense>
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
