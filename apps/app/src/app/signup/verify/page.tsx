"use client";

import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";

function SignupVerifyContent() {
    const searchParams = useSearchParams();
    const email = searchParams.get("email") || "";
    const [isResending, setIsResending] = useState(false);
    const [resendMessage, setResendMessage] = useState<string | null>(null);

    const handleResend = async () => {
        if (!email) return;

        setIsResending(true);
        setResendMessage(null);

        try {
            const supabase = createBrowserClient() as any;
            const { error } = await supabase.auth.resend({
                type: "signup",
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                setResendMessage("メールの再送信に失敗しました。しばらくしてからお試しください。");
            } else {
                setResendMessage("確認メールを再送信しました。");
            }
        } catch {
            setResendMessage("エラーが発生しました。");
        } finally {
            setIsResending(false);
        }
    };

    return (
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <div className="mx-auto bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4 w-16 h-16 flex items-center justify-center">
                    <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                    確認メールを送信しました
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                    {email && (
                        <span className="font-medium text-gray-900 dark:text-white">{email}</span>
                    )}
                    {email && <br />}
                    メール内のリンクをクリックして、登録を完了してください。
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                    <p>メールが届かない場合は、迷惑メールフォルダをご確認ください。</p>
                </div>

                {resendMessage && (
                    <div className={`text-sm p-3 rounded-lg ${
                        resendMessage.includes("失敗") || resendMessage.includes("エラー")
                            ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                            : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                    }`}>
                        {resendMessage}
                    </div>
                )}

                {email && (
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleResend}
                        disabled={isResending}
                    >
                        {isResending ? (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                送信中...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                確認メールを再送信
                            </>
                        )}
                    </Button>
                )}

                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    <Link href="/login">
                        ログインページへ戻る
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}

export default function SignupVerifyPage() {
    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
            <Suspense fallback={
                <Card className="w-full max-w-md text-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </Card>
            }>
                <SignupVerifyContent />
            </Suspense>
        </div>
    );
}
