import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import { SalarySystemsList } from "./salary-systems-list";
import { getSalarySystems } from "./actions";
import { PageTitle } from "@/components/page-title";

export const metadata: Metadata = {
    title: "給与システム",
};

async function checkAccess() {
    const supabase = await createServerClient() as any;
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

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile?.store_id) {
        redirect("/app/me");
    }

    // Only staff/admin can access
    if (!["staff", "admin"].includes(profile.role)) {
        redirect("/app/dashboard");
    }

    return true;
}

function SalarySystemsSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
    );
}

export default async function SalarySystemsPage({
    searchParams,
}: {
    searchParams: Promise<{ type?: string }>;
}) {
    await checkAccess();

    const params = await searchParams;
    const typeFilter = params.type || "cast";

    const salarySystems = await getSalarySystems();

    return (
        <div className="space-y-4">
            <PageTitle
                title="給与体系"
                description="キャスト・スタッフの給与計算システムを管理します。"
                backTab="salary"
            />
            <Suspense fallback={<SalarySystemsSkeleton />}>
                <SalarySystemsList initialSystems={salarySystems} typeFilter={typeFilter} />
            </Suspense>
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
