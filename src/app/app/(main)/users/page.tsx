import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import { UsersTable } from "./users-table";

export const metadata: Metadata = {
    title: "プロフィール情報",
};

// Server-side data fetching
async function getUsersData(roleParam: string, queryParam: string) {
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

    const storeId = currentProfile.store_id;

    // Build query
    let query = supabase
        .from("profiles")
        .select("*, stores(*)")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

    // Filter by role
    const normalizedRole = roleParam.toLowerCase();
    if (normalizedRole && ["cast", "staff", "guest"].includes(normalizedRole)) {
        if (normalizedRole === "staff") {
            query = query.in("role", ["staff", "admin"]);
        } else {
            query = query.eq("role", normalizedRole);
        }
    } else {
        query = query.eq("role", "cast");
    }

    // Filter by search query
    if (queryParam) {
        query = query.or(
            `display_name.ilike.%${queryParam}%,real_name.ilike.%${queryParam}%`
        );
    }

    const { data: profiles, error } = await query;

    if (error) {
        console.error("Error fetching profiles:", error);
        throw new Error(error.message);
    }

    return {
        profiles: profiles || [],
        role: normalizedRole || "cast",
    };
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
    searchParams: { role?: string; query?: string };
}) {
    const roleParam = searchParams.role || "cast";
    const queryParam = searchParams.query || "";

    const data = await getUsersData(roleParam, queryParam);
    const { profiles, role } = data;

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">プロフィール情報</h1>
                <p className="text-xs md:text-sm text-muted-foreground dark:text-gray-400">
                    キャスト・スタッフ・ゲストのプロフィールを管理します。
                </p>
            </div>

            <Suspense fallback={<UsersSkeleton />}>
                <UsersTable profiles={profiles} roleFilter={role} />
            </Suspense>
        </div>
    );
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
