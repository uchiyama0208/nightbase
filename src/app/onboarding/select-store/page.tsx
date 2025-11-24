import { createServerClient } from "@/lib/supabaseServerClient";
import { redirect } from "next/navigation";
import { SelectStoreForm } from "./select-store-form";

export default async function SelectStorePage() {
    const supabase = await createServerClient();
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
        // User already has a profile, check approval status
        const { data: profile } = await supabase
            .from("profiles")
            .select("approval_status")
            .eq("id", appUser.current_profile_id)
            .maybeSingle();

        if (profile?.approval_status === "pending") {
            redirect("/onboarding/pending-approval");
        } else if (profile?.approval_status === "approved") {
            redirect("/app/dashboard");
        }
        // If rejected, allow to continue and select new store
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                <SelectStoreForm />
            </div>
        </div>
    );
}
