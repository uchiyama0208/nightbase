import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import { UsersTable } from "./users-table";

export const metadata: Metadata = {
    title: "プロフィール情報",
};

import { getAppData } from "../../data-access";

// Server-side data fetching
async function getUsersData(storeId: string, currentProfileId: string) {
    const supabase = await createServerClient();

    // Build query
    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*, stores(*)")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching profiles:", error);
        throw new Error(error.message);
    }

    // Get current user's role permissions
    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("role_id, store_roles(permissions)")
        .eq("id", currentProfileId)
        .single();

    const storeRoles = currentProfile?.store_roles as any;
    const hidePersonalInfo = storeRoles?.permissions?.hide_personal_info || false;

    return { profiles: profiles || [], hidePersonalInfo };
}

function UsersSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
    );
}

// Server Component
export default async function UsersPage({
    searchParams,
}: {
    searchParams: Promise<{ role?: string; query?: string }>;
}) {
    const params = await searchParams;
    const roleParam = params.role || "cast";

    const { user, profile } = await getAppData();

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    const { profiles, hidePersonalInfo } = await getUsersData(profile.store_id, profile.id);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">プロフィール情報</h1>
                <p className="mt-2 text-sm text-muted-foreground dark:text-gray-400">
                    キャスト・スタッフ・ゲストのプロフィールを管理します。
                </p>
            </div>

            <Suspense fallback={<UsersSkeleton />}>
                <UsersTable profiles={profiles} roleFilter={roleParam} hidePersonalInfo={hidePersonalInfo} />
            </Suspense>
        </div>
    );
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
