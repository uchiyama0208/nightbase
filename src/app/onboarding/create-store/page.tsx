"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function CreateStorePage() {
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLineLogin = async () => {
        setLoading(true);

        try {
            // Get Supabase URL from environment
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

            console.log("Supabase URL:", supabaseUrl);

            if (!supabaseUrl) {
                console.error("NEXT_PUBLIC_SUPABASE_URL is not defined");
                alert("設定エラー: Supabase URLが見つかりません");
                setLoading(false);
                return;
            }

            // Redirect to Edge Function
            const edgeFunctionUrl = `${supabaseUrl}/functions/v1/line-auth?mode=create-store`;
            console.log("Redirecting to:", edgeFunctionUrl);
            window.location.href = edgeFunctionUrl;
        } catch (error) {
            console.error("LINE login error:", error);
            alert("ログインに失敗しました");
            setLoading(false);
        }
    };

    const canProceed = termsAccepted && privacyAccepted;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full space-y-6">
                <div className="flex items-center space-x-4">
                    <Link
                        href="/signup"
                        className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        店舗データを作成
                    </h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-gray-900 dark:text-white">利用規約とプライバシーポリシー</CardTitle>
                        <CardDescription className="text-gray-900 dark:text-white">
                            サービスをご利用いただく前に、以下の内容をご確認ください
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="terms"
                                    checked={termsAccepted}
                                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                                />
                                <div className="space-y-1">
                                    <Label htmlFor="terms" className="cursor-pointer font-medium">
                                        利用規約に同意する
                                    </Label>
                                    <p className="text-sm text-gray-900 dark:text-white">
                                        <Link
                                            href="/terms-of-service"
                                            target="_blank"
                                            className="text-gray-900 dark:text-white hover:underline"
                                        >
                                            利用規約を確認する
                                        </Link>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="privacy"
                                    checked={privacyAccepted}
                                    onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
                                />
                                <div className="space-y-1">
                                    <Label htmlFor="privacy" className="cursor-pointer font-medium">
                                        プライバシーポリシーに同意する
                                    </Label>
                                    <p className="text-sm text-gray-900 dark:text-white">
                                        <Link
                                            href="/privacy-policy"
                                            target="_blank"
                                            className="text-gray-900 dark:text-white hover:underline"
                                        >
                                            プライバシーポリシーを確認する
                                        </Link>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <Button
                                onClick={handleLineLogin}
                                disabled={!canProceed || loading}
                                className="w-full bg-[#00B900] hover:bg-[#00A000] text-white"
                                size="lg"
                            >
                                {loading ? "処理中..." : "LINEで登録"}
                            </Button>
                            {!canProceed && (
                                <p className="text-sm text-gray-900 dark:text-white text-center mt-2">
                                    両方の項目にチェックを入れてください
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
