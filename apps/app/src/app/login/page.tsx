import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";
import { LoginButton } from "./login-button";
import { LineLoginButton } from "./line-login-button";
import { PasswordInput } from "./password-input";
import { Card, CardContent } from "@/components/ui/card";
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
        <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-md mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ログイン</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        アカウントにログインして始めましょう
                    </p>
                </div>

                <Card className="border-gray-200 dark:border-gray-700">
                    <CardContent className="pt-6 space-y-6">
                        {/* LINE Login */}
                        <LineLoginButton />

                        {/* Divider */}
                        <div className="flex items-center gap-4 py-2">
                            <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                またはメールアドレスでログイン
                            </span>
                            <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                        </div>

                        {/* Email Login Form */}
                        <form action="/app/auth/login" method="post" className="space-y-4">
                            {redirectTo && (
                                <input type="hidden" name="redirect" value={redirectTo} />
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    メールアドレス
                                </Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    placeholder="example@email.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        パスワード
                                    </Label>
                                    <a
                                        href="/forgot-password"
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                    >
                                        パスワードを忘れた方
                                    </a>
                                </div>
                                <PasswordInput />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                メールアドレスでログイン
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

                        {/* Sign up link */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-2">
                            <div className="text-center space-y-1">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    アカウントをお持ちでないですか？
                                </p>
                                <a href={redirectTo ? `/signup?redirect=${encodeURIComponent(redirectTo)}` : "/signup"} className="block text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                                    新規登録
                                </a>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
