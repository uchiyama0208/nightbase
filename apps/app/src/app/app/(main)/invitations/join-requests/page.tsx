import { createServerClient } from "@/lib/supabaseServerClient";
import { redirect } from "next/navigation";
import { JoinRequestsList } from "./join-requests-list";
import { PageTitle } from "@/components/page-title";

export default async function JoinRequestsPage() {
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
        <div className="space-y-6">
            <PageTitle
                title="参加申請"
                description="店舗への参加申請を管理します"
                backTab="user"
            />
            <JoinRequestsList requests={joinRequests || []} />
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
