import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServerClient";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const token = searchParams.get("token");

    if (!code || !token) {
        return NextResponse.redirect(`${origin}/login?message=Invalid invitation link`);
    }

    const supabase = await createServerClient();
    const { error: authError } = await supabase.auth.exchangeCodeForSession(code);

    if (authError) {
        console.error("Auth error:", authError);
        return NextResponse.redirect(`${origin}/login?message=Authentication failed`);
    }

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.redirect(`${origin}/login?message=User not found`);
    }

    // Get invitation details securely
    // We can use the RPC function we created earlier, or query directly since we are on server
    // But we need to be careful with RLS.
    // Since we are now authenticated as the new user, we might not have access to the invitation table via standard RLS yet
    // because the RLS policy checks for store membership, which we don't have yet.
    // So we should use the RPC function `get_invitation_by_token` or a service role client if we had one (we don't here).
    // However, `get_invitation_by_token` is SECURITY DEFINER, so it works.

    const { data: invitations, error: invError } = await supabase.rpc("get_invitation_by_token", {
        lookup_token: token
    });

    if (invError || !invitations || invitations.length === 0) {
        console.error("Invitation fetch error:", invError);
        return NextResponse.redirect(`${origin}/app/dashboard?message=Invitation not found or expired`);
    }

    const invitation = invitations[0];

    // Link profile to user
    // We need to update the profile with the user_id
    // The user might not have permission to update the profile via RLS yet.
    // So we might need another RPC function or temporarily allow it?
    // Or, we can rely on the fact that `profiles` RLS might allow update if `user_id` is null?
    // Let's check profiles RLS policies later. For now, let's try to update.
    // If it fails, we'll need a secure function.

    // Actually, it's safer to use a RPC function to "accept invitation" which handles the profile update and invitation status update atomically.

    const { error: acceptError } = await supabase.rpc("accept_invitation", {
        invitation_id: invitation.id,
        target_user_id: user.id
    });

    if (acceptError) {
        console.error("Accept invitation error:", acceptError);
        // It might fail if already linked or other constraints.
        // But if it fails, we still redirect to dashboard, maybe the user is already linked.
        return NextResponse.redirect(`${origin}/app/dashboard?message=Failed to accept invitation`);
    }

    return NextResponse.redirect(`${origin}/app/dashboard?message=Successfully joined`);
}
