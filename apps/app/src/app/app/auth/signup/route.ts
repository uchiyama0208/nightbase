import { createServerClient } from "@/lib/supabaseServerClient";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const requestUrl = new URL(request.url);
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const redirectTo = formData.get("redirect") as string | null;
    const supabase = await createServerClient() as any;

    // Use email local part as default display name
    const defaultDisplayName = email.split("@")[0];

    // Build email redirect URL with optional redirect parameter
    let emailRedirectTo = `${requestUrl.origin}/auth/callback`;
    if (redirectTo) {
        emailRedirectTo += `?redirect=${encodeURIComponent(redirectTo)}`;
    }

    // Use Supabase Auth signUp - this will send confirmation email via Resend SMTP
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo,
            data: {
                display_name: defaultDisplayName,
                role: "guest",
            },
        },
    });

    if (error) {
        console.error("=== EMAIL SIGNUP ERROR ===");
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        console.error("=========================");

        const redirectParam = redirectTo ? `&redirect=${encodeURIComponent(redirectTo)}` : "";

        // Check if user already exists
        if (error.message?.includes("already registered") || error.code === "user_already_exists") {
            return NextResponse.redirect(
                `${requestUrl.origin}/signup?message=${encodeURIComponent("このメールアドレスは既に登録されています。")}${redirectParam}`,
                { status: 301 }
            );
        }

        return NextResponse.redirect(
            `${requestUrl.origin}/signup?message=${encodeURIComponent("アカウントの作成に失敗しました。もう一度お試しください。")}${redirectParam}`,
            { status: 301 }
        );
    }

    console.log("User signup initiated:", data.user?.id);
    console.log("Confirmation email sent to:", email);

    // Redirect to verification page
    const redirectParam = redirectTo ? `&redirect=${encodeURIComponent(redirectTo)}` : "";
    return NextResponse.redirect(
        `${requestUrl.origin}/signup/verify?email=${encodeURIComponent(email)}${redirectParam}`,
        { status: 301 }
    );
}

