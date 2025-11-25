import { createServerClient } from "@/lib/supabaseServerClient";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const requestUrl = new URL(request.url);
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const supabase = await createServerClient();

    // Use email local part as default display name
    const defaultDisplayName = email.split("@")[0];

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${requestUrl.origin}/app/auth/callback`,
            data: {
                display_name: defaultDisplayName,
                role: "guest", // Default role
            },
        },
    });

    if (error) {
        console.error("Signup error:", error);
        return NextResponse.redirect(
            `${requestUrl.origin}/signup?message=${encodeURIComponent("アカウントの作成に失敗しました。すでに登録されているメールアドレスの可能性があります。")}`,
            {
                status: 301,
            }
        );
    }

    return NextResponse.redirect(
        `${requestUrl.origin}/signup/verify`,
        {
            status: 301,
        }
    );
}
