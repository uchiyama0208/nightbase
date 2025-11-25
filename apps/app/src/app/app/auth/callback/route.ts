import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServerClient";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/onboarding/choice";

    if (code) {
        const supabase = await createServerClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && data.user) {
            // Check if user record exists in our users table
            const { data: appUser } = await supabase
                .from("users")
                .select("id, current_profile_id")
                .eq("id", data.user.id)
                .maybeSingle();

            // If user doesn't exist, create user record
            if (!appUser) {
                const { error: userError } = await supabase
                    .from("users")
                    .insert({
                        id: data.user.id,
                        email: data.user.email,
                    });

                if (userError) {
                    console.error("Failed to create user record:", userError);
                }

                // Create initial profile for email users
                const displayName = data.user.user_metadata?.display_name || data.user.email?.split('@')[0] || "ゲスト";

                const { data: newProfile, error: profileError } = await supabase
                    .from("profiles")
                    .insert({
                        user_id: data.user.id,
                        display_name: displayName,
                        real_name: displayName,
                        role: "guest",
                    })
                    .select("id")
                    .single();

                if (profileError) {
                    console.error("Failed to create profile:", profileError);
                } else if (newProfile) {
                    // Set current_profile_id
                    await supabase
                        .from("users")
                        .update({ current_profile_id: newProfile.id })
                        .eq("id", data.user.id);
                }
            }

            return NextResponse.redirect(`${origin}${next}`);
        } else if (error) {
            console.error("Auth callback error:", error);
            return NextResponse.redirect(`${origin}/login?message=${encodeURIComponent(`認証エラー: ${error.message}`)}`);
        }
    }

    return NextResponse.redirect(`${origin}/login?message=${encodeURIComponent("認証コードが見つかりませんでした。")}`);
}
