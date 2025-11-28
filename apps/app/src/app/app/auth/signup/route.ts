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

    // Get Supabase URL and service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error("Missing Supabase configuration");
        return NextResponse.redirect(
            `${requestUrl.origin}/signup?message=${encodeURIComponent("サーバー設定エラーが発生しました。")}`,
            { status: 301 }
        );
    }

    console.log("=== EMAIL SIGNUP DEBUG ===");
    console.log("Email:", email);
    console.log("Supabase URL:", supabaseUrl);
    console.log("=========================");

    // Use Admin API directly to bypass potential client-side issues
    const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "apikey": serviceRoleKey,
            "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
            email,
            password,
            email_confirm: true, // Skip email verification for development
            user_metadata: {
                display_name: defaultDisplayName,
                role: "guest",
            },
        }),
    });

    if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json();
        console.error("=== EMAIL SIGNUP ERROR ===");
        console.error("Error message:", errorData.msg || errorData.message);
        console.error("Error code:", errorData.code);
        console.error("Status:", createUserResponse.status);
        console.error("Full error:", JSON.stringify(errorData, null, 2));
        console.error("Attempted email:", email);
        console.error("=========================");

        // Check if user already exists
        if (errorData.msg?.includes("already been registered") || errorData.code === "user_already_exists") {
            return NextResponse.redirect(
                `${requestUrl.origin}/signup?message=${encodeURIComponent("このメールアドレスは既に登録されています。")}`,
                { status: 301 }
            );
        }

        return NextResponse.redirect(
            `${requestUrl.origin}/signup?message=${encodeURIComponent("アカウントの作成に失敗しました。もう一度お試しください。")}`,
            { status: 301 }
        );
    }

    const userData = await createUserResponse.json();
    console.log("User created successfully:", userData.id);
    console.log("User can login immediately (email_confirm: true)");

    return NextResponse.redirect(
        `${requestUrl.origin}/login?message=${encodeURIComponent("アカウントが作成されました。ログインしてください。")}`,
        {
            status: 301,
        }
    );
}

