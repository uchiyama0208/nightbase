import { getInvitationByToken } from "../../app/(main)/invitations/actions";
import { InviteClient } from "./invite-client";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";

interface InvitePageProps {
    params: Promise<{
        token: string;
    }>;
}

export async function generateMetadata({ params }: InvitePageProps) {
    return {
        title: "店舗への招待 | Nightbase",
    };
}

export default async function InvitePage({ params }: InvitePageProps) {
    const { token } = await params;
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();



    const invitation = await getInvitationByToken(token);

    if (!invitation) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">招待が見つかりません</h1>
                    <p className="text-muted-foreground">
                        この招待リンクは無効か、期限切れ、またはキャンセルされています。
                    </p>
                </div>
            </div>
        );
    }

    if (user) {
        // Check if user is already a member of this store
        const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .eq("store_id", invitation.store_id)
            .maybeSingle();

        if (existingProfile) {
            // Already a member, redirect to dashboard
            redirect("/app/dashboard");
        }
    }

    // Transform data for client component
    const clientInvitation = {
        id: invitation.id,
        token: token, // Pass the token from params
        store_name: invitation.store_name,
        profile_name: invitation.profile_name,
        expires_at: invitation.expires_at,
        has_password: !!invitation.password_hash,
    };

    return <InviteClient invitation={clientInvitation} userId={user?.id} />;
}
