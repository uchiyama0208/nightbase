import { createServerClient } from "@/lib/supabaseServerClient";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const requestUrl = new URL(request.url);
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const supabase = await createServerClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return NextResponse.redirect(
            `${requestUrl.origin}/login?message=${encodeURIComponent("ログインに失敗しました。メールアドレスまたはパスワードが正しくありません。")}`,
            {
                status: 301,
            }
        );
    }

    return NextResponse.redirect(`${requestUrl.origin}/app/dashboard`, {
        status: 301,
    });
}
