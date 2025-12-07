import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import { LoginButton } from "./login-button";
import { LineLoginButton } from "./line-login-button";
import { PasswordInput } from "./password-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string; password_reset?: string; redirect?: string }>;
}) {
    const { message, password_reset, redirect: redirectTo } = await searchParams;
    const supabase = await createServerClient() as any;
    const { data: { session } } = await supabase.auth.getSession();

    // Allow users to access login page even if authenticated
    // They can logout from /onboarding if needed
    if (session) {
        // Check if user has a profile and store
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
                    // User has profile and store, redirect to dashboard
                    return redirect("/app/dashboard");
                }
            }

            // User is authenticated but needs to complete onboarding
            return redirect("/onboarding/choice");
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">ログイン</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        アカウントにログインして始めましょう
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-gray-900 dark:text-white">ログイン</CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400">
                            ログイン方法を選択してください
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Login Method Selection */}
                        <div className="space-y-4">
                            <LineLoginButton />

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300 dark:border-gray-700" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                                        またはメールアドレスでログイン
                                    </span>
                                </div>
                            </div>

                            <form action="/app/auth/login" method="post" className="space-y-4">
                                {redirectTo && (
                                    <input type="hidden" name="redirect" value={redirectTo} />
                                )}
                                <div>
                                    <Label htmlFor="email" className="text-gray-900 dark:text-white">
                                        メールアドレス
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        placeholder="example@email.com"
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password" className="text-gray-900 dark:text-white">
                                            パスワード
                                        </Label>
                                        <a
                                            href="/forgot-password"
                                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                        >
                                            パスワードを忘れた方
                                        </a>
                                    </div>
                                    <div className="mt-1">
                                        <PasswordInput />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    size="lg"
                                >
                                    ログイン
                                </Button>

                                {password_reset === "success" && (
                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                        <p className="text-sm text-green-600 dark:text-green-400 text-center">
                                            パスワードを変更しました。新しいパスワードでログインしてください。
                                        </p>
                                    </div>
                                )}

                                {message && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                        <p className="text-sm text-red-600 dark:text-red-400 text-center">
                                            {message}
                                        </p>
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                            アカウントをお持ちでないですか？
                            <a href={redirectTo ? `/signup?redirect=${encodeURIComponent(redirectTo)}` : "/signup"} className="ml-1 font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                                新規登録
                            </a>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
