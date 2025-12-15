import { createServerClient } from "@/lib/supabaseServerClient";
import { getStoreForJoin } from "./actions";
import { JoinForm } from "./join-form";
import { AlreadyMemberCard } from "./already-member-card";
import { PendingApprovalCard } from "./pending-approval-card";

interface JoinPageProps {
    params: Promise<{ storeId: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
    const { storeId } = await params;
    const supabase = await createServerClient() as any;

    // Check if store exists and accepts URL joins
    const storeResult = await getStoreForJoin(storeId);

    if (!storeResult.success || !storeResult.store) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-4">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                        <h1 className="text-xl font-bold text-red-600 dark:text-red-400">
                            エラー
                        </h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            {storeResult.error}
                        </p>
                    </div>
                    <a
                        href="/login"
                        className="inline-block text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        ログインページへ
                    </a>
                </div>
            </div>
        );
    }

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();

    // If user is logged in, check if they already have a profile for this store
    let memberStatus: "none" | "pending" | "approved" = "none";
    if (user) {
        const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id, role")
            .eq("user_id", user.id)
            .eq("store_id", storeId)
            .maybeSingle();

        if (existingProfile) {
            // If profile has a role, they are already a member
            if (existingProfile.role) {
                memberStatus = "approved";
            } else {
                // Check if there's a pending join request
                const { data: joinRequest } = await supabase
                    .from("join_requests")
                    .select("id, status")
                    .eq("profile_id", existingProfile.id)
                    .eq("status", "pending")
                    .maybeSingle();

                if (joinRequest) {
                    memberStatus = "pending";
                }
            }
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                {memberStatus === "approved" ? (
                    <AlreadyMemberCard store={storeResult.store} />
                ) : memberStatus === "pending" ? (
                    <PendingApprovalCard store={storeResult.store} />
                ) : (
                    <JoinForm
                        store={storeResult.store}
                        isLoggedIn={!!user}
                    />
                )}
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';
