"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, UserPlus, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useSearchParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";

export default function OnboardingChoicePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createBrowserClient();

    useEffect(() => {
        const handleSession = async () => {
            const accessToken = searchParams.get("access_token");
            const refreshToken = searchParams.get("refresh_token");

            if (accessToken && refreshToken) {
                try {
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (error) {
                        console.error("Error setting session:", error);
                    } else {
                        // Remove tokens from URL for cleaner history
                        const newUrl = new URL(window.location.href);
                        newUrl.searchParams.delete("access_token");
                        newUrl.searchParams.delete("refresh_token");
                        window.history.replaceState({}, "", newUrl.toString());
                    }
                } catch (err) {
                    console.error("Unexpected error setting session:", err);
                }
            }
            setIsLoading(false);
        };

        handleSession();
    }, [searchParams, supabase.auth]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">認証情報を確認中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Nightbaseへようこそ
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        はじめに、以下のいずれかを選択してください
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Create Store Option */}
                    <Link href="/onboarding/profile?mode=create">
                        <Card className="h-full hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary">
                            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                                <div className="p-3 rounded-full bg-primary/10 text-primary">
                                    <Building2 className="h-10 w-10" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        店舗データを作成
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        新しい店舗を登録して、管理を始めます
                                    </p>
                                </div>
                                <ul className="text-sm text-left text-gray-600 dark:text-gray-400 space-y-2">
                                    <li>✓ 店舗情報の登録</li>
                                    <li>✓ スタッフの招待</li>
                                    <li>✓ 勤怠管理の開始</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Join Store Option */}
                    <Link href="/onboarding/select-store">
                        <Card className="h-full hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary">
                            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                                    <UserPlus className="h-10 w-10" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        店舗に参加
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        招待を受けた店舗に参加します
                                    </p>
                                </div>
                                <ul className="text-sm text-left text-gray-600 dark:text-gray-400 space-y-2">
                                    <li>✓ 招待リンクから参加</li>
                                    <li>✓ すぐに勤務開始</li>
                                    <li>✓ 簡単な登録手続き</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                <div className="text-center">
                    <Link href="/login" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary">
                        既にアカウントをお持ちの方はこちら
                    </Link>
                </div>
            </div>
        </div>
    );
}
