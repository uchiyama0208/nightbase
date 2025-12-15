import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServerClient";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createServerClient() as any;

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get current user's profile to verify store access
        const { data: appUser } = await supabase
            .from("users")
            .select("current_profile_id")
            .eq("id", user.id)
            .maybeSingle();

        if (!appUser?.current_profile_id) {
            return NextResponse.json({ error: "No profile selected" }, { status: 400 });
        }

        const { data: currentProfile } = await supabase
            .from("profiles")
            .select("store_id")
            .eq("id", appUser.current_profile_id)
            .maybeSingle();

        if (!currentProfile?.store_id) {
            return NextResponse.json({ error: "No store found" }, { status: 400 });
        }

        // Fetch the requested profile
        const { data: profile, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", id)
            .eq("store_id", currentProfile.store_id)
            .maybeSingle();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        return NextResponse.json(profile);
    } catch (error) {
        console.error("Error fetching profile:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
