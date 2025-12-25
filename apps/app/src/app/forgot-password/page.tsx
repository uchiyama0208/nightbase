"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Mail, CheckCircle } from "lucide-react";
import Link from "next/link";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const result = await requestPasswordReset(email);

        if (result.success) {
            setIsSuccess(true);
        } else {
            setError(result.error || "エラーが発生しました");
        }

        setIsSubmitting(false);
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 py-8">
                <div className="max-w-md w-full">
                    <Card>
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <CardTitle className="text-gray-900 dark:text-white">メールを送信しました</CardTitle>
                            <CardDescription className="text-gray-600 dark:text-gray-400">
                                パスワードリセット用のリンクを送信しました。
                                メールをご確認ください。
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                                メールが届かない場合は、迷惑メールフォルダをご確認いただくか、
                                再度お試しください。
                            </p>
                            <div className="flex flex-col gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsSuccess(false);
                                        setEmail("");
                                    }}
                                    className="w-full"
                                >
                                    別のメールアドレスで再送信
                                </Button>
                                <Link href="/login" className="w-full">
                                    <Button variant="ghost" className="w-full">
                                        <ChevronLeft className="mr-2 h-4 w-4" />
                                        ログインに戻る
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
            <div className="max-w-md w-full">
                <div className="mb-6">
                    <Link
                        href="/login"
                        className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        ログインに戻る
                    </Link>
                </div>

                <Card>
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <CardTitle className="text-gray-900 dark:text-white">パスワードをリセット</CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400">
                            登録したメールアドレスを入力してください。
                            パスワードリセット用のリンクをお送りします。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
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
                                    className="mt-1"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
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
                                disabled={isSubmitting || !email}
                            >
                                {isSubmitting ? "送信中..." : "リセットリンクを送信"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
