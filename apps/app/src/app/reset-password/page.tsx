"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isValidLink, setIsValidLink] = useState<boolean | null>(null);

    useEffect(() => {
        // Check if we have a valid recovery session
        const checkSession = async () => {
            const supabase = createBrowserClient() as any;

            // Supabase redirects with hash parameters for recovery
            // The client will automatically pick these up
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error("Session error:", error);
                setIsValidLink(false);
                return;
            }

            // Check if this is a recovery session
            // The session should exist if coming from a valid recovery link
            if (session) {
                setIsValidLink(true);
            } else {
                // Try to exchange the code from URL if present
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get("access_token");
                const type = hashParams.get("type");

                if (accessToken && type === "recovery") {
                    // Set the session using the tokens from the URL
                    const refreshToken = hashParams.get("refresh_token");
                    if (refreshToken) {
                        const { error: setSessionError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });

                        if (setSessionError) {
                            console.error("Set session error:", setSessionError);
                            setIsValidLink(false);
                        } else {
                            setIsValidLink(true);
                            // Clean the URL
                            window.history.replaceState({}, document.title, window.location.pathname);
                        }
                    } else {
                        setIsValidLink(false);
                    }
                } else {
                    setIsValidLink(false);
                }
            }
        };

        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError("パスワードは6文字以上で入力してください");
            return;
        }

        if (password !== confirmPassword) {
            setError("パスワードが一致しません");
            return;
        }

        setIsSubmitting(true);

        const supabase = createBrowserClient() as any;

        const { error: updateError } = await supabase.auth.updateUser({
            password: password,
        });

        if (updateError) {
            console.error("Password update error:", updateError);
            if (updateError.message.includes("should be different")) {
                setError("新しいパスワードは現在のパスワードと異なるものを設定してください");
            } else {
                setError("パスワードの更新に失敗しました。もう一度お試しください。");
            }
            setIsSubmitting(false);
            return;
        }

        setIsSuccess(true);
        setIsSubmitting(false);

        // Sign out and redirect to login after a delay
        setTimeout(async () => {
            await supabase.auth.signOut();
            router.push("/login?password_reset=success");
        }, 2000);
    };

    // Loading state
    if (isValidLink === null) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 py-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">確認中...</p>
                </div>
            </div>
        );
    }

    // Invalid or expired link
    if (!isValidLink) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 py-8">
                <div className="max-w-md w-full">
                    <Card>
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                            <CardTitle className="text-gray-900 dark:text-white">無効なリンク</CardTitle>
                            <CardDescription className="text-gray-600 dark:text-gray-400">
                                このパスワードリセットリンクは無効か、有効期限が切れています。
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/forgot-password" className="w-full">
                                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                    新しいリセットリンクをリクエスト
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Success state
    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 py-8">
                <div className="max-w-md w-full">
                    <Card>
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <CardTitle className="text-gray-900 dark:text-white">パスワードを変更しました</CardTitle>
                            <CardDescription className="text-gray-600 dark:text-gray-400">
                                新しいパスワードでログインできます。
                                ログインページにリダイレクトします...
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
            <div className="max-w-md w-full">
                <Card>
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <CardTitle className="text-gray-900 dark:text-white">新しいパスワードを設定</CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400">
                            新しいパスワードを入力してください。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="password" className="text-gray-900 dark:text-white">
                                    新しいパスワード
                                </Label>
                                <div className="mt-1 relative">
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        placeholder="6文字以上"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="confirmPassword" className="text-gray-900 dark:text-white">
                                    パスワード（確認）
                                </Label>
                                <div className="mt-1 relative">
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        placeholder="パスワードを再入力"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <p className="text-sm text-red-600 dark:text-red-400 text-center">
                                        {error}
                                    </p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                size="lg"
                                disabled={isSubmitting || !password || !confirmPassword}
                            >
                                {isSubmitting ? "更新中..." : "パスワードを変更"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
