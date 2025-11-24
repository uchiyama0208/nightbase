"use client";

import { Button } from "@/components/ui/button";


export function LineLoginButton() {
    const handleLineLogin = async () => {
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            if (!supabaseUrl) {
                alert("設定エラー: Supabase URLが見つかりません");
                return;
            }

            // Redirect to the line-auth Edge Function via Next.js API route
            // mode=login indicates this is a normal login attempt
            const apiUrl = `/api/line-link?mode=login`;
            window.location.href = apiUrl;

        } catch (error) {
            console.error("Login error:", error);
            alert("ログインに失敗しました");
        }
    };

    return (
        <Button
            onClick={handleLineLogin}
            className="flex w-full items-center justify-center gap-2 bg-[#00C300] text-white hover:bg-[#00B300]"
            type="button"
        >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M20.6 10c.2 1.3-.2 2.5-.9 3.6-1.2 1.8-3.2 3-5.5 3.3-.5.1-1 .1-1.5.1-1.3 0-2.6-.3-3.7-.9-.2-.1-.4-.2-.6-.4-.1 0-.1-.1-.2-.1-.1 0-.2 0-.2.1-.1.1-.2.2-.3.3-.2.2-.4.5-.6.7-.1.1-.2.2-.3.2-.1 0-.2 0-.3-.1-.1-.1-.2-.1-.3-.2-.5-.4-.9-.9-1.2-1.4-.1-.2-.1-.4-.2-.6 0-.1 0-.2.1-.2.1-.1.2-.1.3-.1.2 0 .4 0 .6.1 1.1.3 2.3.4 3.5.2 1.8-.3 3.4-1.4 4.4-3 .6-.9.9-1.9.9-3 0-2.8-2.5-5-5.6-5-3.1 0-5.6 2.3-5.6 5 0 1.6.8 3 2.2 4 .1.1.2.1.2.2 0 .1-.1.2-.1.3-.2.7-.5 1.4-.8 2-.1.2-.2.3-.3.5-.1.1-.1.2-.1.3 0 .1.1.2.2.2.1 0 .2 0 .3-.1 1.7-.8 3.1-2 4.1-3.5.3-.5.6-1 .7-1.6.1-.3.1-.6.1-.9 0-2.8-2.5-5-5.6-5-3.1 0-5.6 2.3-5.6 5z" />
            </svg>
            LINEでログイン
        </Button>
    );
}
