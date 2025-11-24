import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import { RolesPageClient } from "./roles-client";

export const metadata: Metadata = {
    title: "権限管理",
};

async function getRolesData() {
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
        .select("store_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile?.store_id) {
        redirect("/app/me");
    }

    if (currentProfile.role !== "staff") {
        redirect("/app/dashboard");
    }

    const { data: roles } = await supabase
        .from("store_roles")
        .select("*")
        .eq("store_id", currentProfile.store_id)
        .order("created_at", { ascending: true });

    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, role_id")
        .eq("store_id", currentProfile.store_id);

    return {
        roles: roles || [],
        profiles: profiles || [],
    };
}

function RolesSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
    );
}

export default async function RolesPage() {
    const data = await getRolesData();

    return (
        <Suspense fallback={<RolesSkeleton />}>
            <RolesPageClient roles={data.roles} profiles={data.profiles} />
        </Suspense>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
