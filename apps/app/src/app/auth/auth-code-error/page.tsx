"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AuthCodeErrorPage() {
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [errorMessage, setErrorMessage] = useState<string>("");

    useEffect(() => {
        const handleAuth = async () => {
            // Get hash fragment
            const hash = window.location.hash.substring(1);
            if (!hash) {
                setStatus("error");
                setErrorMessage("認証情報が見つかりません。");
                return;
            }

            // Parse hash fragment
            const params = new URLSearchParams(hash);

            // Check for error
            const error = params.get("error");
            if (error) {
                setStatus("error");
                const errorDescription = params.get("error_description") || "認証エラーが発生しました。";
                if (error === "access_denied" && params.get("error_code") === "otp_expired") {
                    setErrorMessage("メールリンクの有効期限が切れています。再度登録してください。");
                } else {
                    setErrorMessage(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
                }
                return;
            }

            // Check for access token (implicit flow)
            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");

            if (accessToken && refreshToken) {
                try {
                    const supabase = createBrowserClient();
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (sessionError) {
                        setStatus("error");
                        setErrorMessage("セッションの設定に失敗しました。");
                        return;
                    }

                    setStatus("success");

                    // Check user profile and redirect
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: appUser } = await supabase
                            .from("users")
                            .select("current_profile_id")
                            .eq("id", user.id)
                            .maybeSingle();

                        if (appUser?.current_profile_id) {
                            const { data: profile } = await supabase
                                .from("profiles")
                                .select("store_id")
                                .eq("id", appUser.current_profile_id)
                                .maybeSingle();

                            if (profile?.store_id) {
                                router.push("/app/dashboard");
                                return;
                            }
                        }
                        router.push("/onboarding/choice");
                    }
                } catch (err) {
                    console.error("Auth error:", err);
                    setStatus("error");
                    setErrorMessage("認証処理中にエラーが発生しました。");
                }
            } else {
                setStatus("error");
                setErrorMessage("認証情報が不完全です。");
            }
        };

        handleAuth();
    }, [router]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    {status === "loading" && (
                        <>
                            <div className="mx-auto bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4 w-16 h-16 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                            </div>
                            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                                認証処理中...
                            </CardTitle>
                            <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                                しばらくお待ちください
                            </CardDescription>
                        </>
                    )}
                    {status === "success" && (
                        <>
                            <div className="mx-auto bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-4 w-16 h-16 flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                                認証成功
                            </CardTitle>
                            <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                                リダイレクト中...
                            </CardDescription>
                        </>
                    )}
                    {status === "error" && (
                        <>
                            <div className="mx-auto bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4 w-16 h-16 flex items-center justify-center">
                                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                            </div>
                            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                                認証エラー
                            </CardTitle>
                            <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                                {errorMessage}
                            </CardDescription>
                        </>
                    )}
                </CardHeader>
                {status === "error" && (
                    <CardContent className="space-y-4">
                        <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                            <Link href="/signup">
                                新規登録ページへ
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/login">
                                ログインページへ
                            </Link>
                        </Button>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}
