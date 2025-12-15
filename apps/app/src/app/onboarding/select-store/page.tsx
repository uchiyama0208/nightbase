import { createServerClient } from "@/lib/supabaseServerClient";
import { redirect } from "next/navigation";
import { SelectStoreForm } from "./select-store-form";

export default async function SelectStorePage() {
    const supabase = await createServerClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/signup");
    }

    // Check if user already has a profile
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (appUser?.current_profile_id) {
        // User already has a profile, check status
        const { data: profile } = await supabase
            .from("profiles")
            .select("id, role")
            .eq("id", appUser.current_profile_id)
            .maybeSingle();

        // If profile has an approved role (cast or staff), they are approved
        // "guest" role means pending/unapproved
        if (profile?.role && profile.role !== "guest") {
            redirect("/app/dashboard");
        }

        // Check join_requests table for pending status
        if (profile) {
            const { data: joinRequest } = await supabase
                .from("join_requests")
                .select("status")
                .eq("profile_id", profile.id)
                .eq("status", "pending")
                .maybeSingle();

            if (joinRequest) {
                redirect("/onboarding/pending-approval");
            }
        }
        // If no pending request (rejected or none), allow to continue and select new store
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                <SelectStoreForm />
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
