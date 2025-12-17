import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import { UsersTable } from "./users-table";
import { getAppDataWithPermissionCheck, getAccessDeniedRedirectUrl, hasPagePermission } from "../../data-access";

export const metadata: Metadata = {
    title: "プロフィール情報",
};

// Server-side data fetching
async function getUsersData(storeId: string) {
    const supabase = await createServerClient() as any;

    // Build query - exclude temporary guests
    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*, stores(*)")
        .eq("store_id", storeId)
        .or("is_temporary.is.null,is_temporary.eq.false")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching profiles:", error);
        throw new Error(error.message);
    }

    return { profiles: profiles || [] };
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

    const { user, profile, hasAccess, canEdit, permissions } = await getAppDataWithPermissionCheck("users", "view");

    if (!user) {
        redirect("/login");
    }

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (!hasAccess) {
        redirect(getAccessDeniedRedirectUrl("users"));
    }

    const { profiles } = await getUsersData(profile.store_id);

    // 各ページの権限をチェック
    const pagePermissions = {
        bottles: hasPagePermission("bottles", "view", profile, permissions ?? null),
        resumes: hasPagePermission("resumes", "view", profile, permissions ?? null),
        salarySystems: hasPagePermission("salary-systems", "view", profile, permissions ?? null),
        attendance: hasPagePermission("attendance", "view", profile, permissions ?? null),
        personalInfo: hasPagePermission("users-personal-info", "view", profile, permissions ?? null),
    };

    // 個人情報の表示/非表示は users-personal-info 権限で制御
    const hidePersonalInfo = !pagePermissions.personalInfo;

    return (
        <Suspense fallback={<UsersSkeleton />}>
            <UsersTable profiles={profiles} roleFilter={roleParam} hidePersonalInfo={hidePersonalInfo} canEdit={canEdit} pagePermissions={pagePermissions} />
        </Suspense>
    );
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
