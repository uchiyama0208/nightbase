"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

export default function LineCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
                    <div className="text-center">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
                        <p className="text-gray-600">ログイン処理中...</p>
                    </div>
                </div>
            }
        >
            <LineCallbackContent />
        </Suspense>
    );
}

function LineCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createBrowserClient();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            const accessToken = searchParams.get("access_token");
            const refreshToken = searchParams.get("refresh_token");
            const next = searchParams.get("next") || "/app/dashboard";
            const isFriend = searchParams.get("is_friend");

            if (!accessToken || !refreshToken) {
                setError("認証トークンが見つかりません。");
                return;
            }

            try {
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (error) {
                    console.error("Error setting session:", error);
                    setError(`セッションの確立に失敗しました: ${error.message}`);
                } else {
                    // Pass is_friend parameter to the next page
                    const redirectUrl = new URL(next, window.location.origin);
                    if (isFriend !== null) {
                        redirectUrl.searchParams.set("is_friend", isFriend);
                    }
                    router.replace(redirectUrl.pathname + redirectUrl.search);
                }
            } catch (err) {
                console.error("Unexpected error:", err);
                setError("予期せぬエラーが発生しました。");
            }
        };

        handleCallback();
    }, [router, searchParams, supabase.auth]);

    if (error) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">ログインエラー</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => router.push("/login")}
                        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                        ログインページへ戻る
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
            <div className="text-center">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">ログイン処理中...</p>
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';
