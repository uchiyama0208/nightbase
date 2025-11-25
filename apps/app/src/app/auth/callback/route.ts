import { createServerClient } from "@/lib/supabaseServerClient";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next");

    if (code) {
        const supabase = await createServerClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && data.user) {
            // Check for invite token in metadata (fallback if next param is lost)
            const inviteToken = data.user.user_metadata?.invite_token;
            if (inviteToken) {
                // Find pending invitation
                const { data: invitedProfile } = await supabase
                    .from("profiles")
                    .select("id, invite_status")
                    .eq("id", inviteToken) // inviteToken is actually the profile ID
                    .maybeSingle();

                if (invitedProfile && invitedProfile.invite_status === "pending") {
                    // Link profile to user
                    const { error: linkError } = await supabase
                        .from("profiles")
                        .update({
                            user_id: data.user.id,
                            invite_status: "accepted",
                            invite_token: null,
                            invite_expires_at: null
                        })
                        .eq("id", invitedProfile.id);

                    if (!linkError) {
                        // Update users table
                        await supabase
                            .from("users")
                            .upsert({
                                id: data.user.id,
                                current_profile_id: invitedProfile.id
                            }, { onConflict: "id" });

                        // Redirect to dashboard directly
                        return NextResponse.redirect(`${origin}/app/dashboard`);
                    }
                }
            }

            // If 'next' parameter is provided, use it
            if (next) {
                return NextResponse.redirect(`${origin}${next}`);
            }

            // Check if user has a profile and store
            const { data: appUser } = await supabase
                .from("users")
                .select("current_profile_id")
                .eq("id", data.user.id)
                .maybeSingle();

            if (!appUser?.current_profile_id) {
                // New user without profile, redirect to onboarding
                return NextResponse.redirect(`${origin}/onboarding/choice`);
            }

            // User has a profile, check if they have a store
            const { data: profile } = await supabase
                .from("profiles")
                .select("store_id")
                .eq("id", appUser.current_profile_id)
                .maybeSingle();

            if (profile?.store_id) {
                // User has store, redirect to dashboard
                return NextResponse.redirect(`${origin}/app/dashboard`);
            }

            // User has profile but no store, continue onboarding
            return NextResponse.redirect(`${origin}/onboarding/choice`);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
