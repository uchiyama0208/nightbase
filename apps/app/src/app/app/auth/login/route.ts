import { createServerClient } from "@/lib/supabaseServerClient";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const requestUrl = new URL(request.url);
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const redirectTo = formData.get("redirect") as string | null;
    const supabase = await createServerClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        const errorRedirect = redirectTo
            ? `/login?message=${encodeURIComponent("ログインに失敗しました。メールアドレスまたはパスワードが正しくありません。")}&redirect=${encodeURIComponent(redirectTo)}`
            : `/login?message=${encodeURIComponent("ログインに失敗しました。メールアドレスまたはパスワードが正しくありません。")}`;
        return NextResponse.redirect(
            `${requestUrl.origin}${errorRedirect}`,
            {
                status: 301,
            }
        );
    }

    // If there's a redirect parameter and it's a valid path, use it
    const finalRedirect = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/app/dashboard";

    return NextResponse.redirect(`${requestUrl.origin}${finalRedirect}`, {
        status: 301,
    });
}
