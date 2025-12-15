import { createServerClient } from "@/lib/supabaseServerClient";
import { redirect } from "next/navigation";
import { PendingApprovalClient } from "./pending-approval-client";

export default async function PendingApprovalPage() {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/signup");
    }

    // Get user's profile and approval status
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        redirect("/signup");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("id, role, stores(name)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile) {
        redirect("/signup");
    }

    // If profile has an approved role (cast or staff), they are approved
    // "guest" role means pending/unapproved
    if (profile.role && profile.role !== "guest") {
        redirect("/app/dashboard");
    }

    // Check join_requests table for status
    const { data: joinRequest } = await supabase
        .from("join_requests")
        .select("status")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    const storeName = (profile.stores as any)?.name || "店舗";
    const status = (joinRequest?.status || "pending") as "pending" | "rejected";

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                <PendingApprovalClient
                    status={status}
                    storeName={storeName}
                />
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
