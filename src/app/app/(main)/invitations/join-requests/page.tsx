import { createServerClient } from "@/lib/supabaseServerClient";
import { redirect } from "next/navigation";
import { JoinRequestsList } from "./join-requests-list";

export default async function JoinRequestsPage() {
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

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile || !profile.store_id) {
        redirect("/app/me");
    }

    if (profile.role !== "staff") {
        redirect("/app/dashboard");
    }

    // Fetch pending join requests
    const { data: joinRequests } = await supabase
        .from("profiles")
        .select("id, display_name, real_name, role, created_at, approval_status")
        .eq("store_id", profile.store_id)
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">参加申請</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    店舗への参加申請を管理します
                </p>
            </div>

            <JoinRequestsList requests={joinRequests || []} />
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
