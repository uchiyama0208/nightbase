import { Suspense } from "react";
import Link from "next/link";
import { Building2, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { OnboardingChoiceAuth } from "./onboarding-choice-auth";
import { LogoutButton } from "./logout-button";

export default function OnboardingChoicePage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full space-y-6">
                <Suspense fallback={
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">読み込み中...</p>
                    </div>
                }>
                    <OnboardingChoiceAuth />
                </Suspense>

                <div className="text-center space-y-1">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Nightbaseへようこそ
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        以下のいずれかを選択してください
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {/* Create Store Option */}
                    <Link href="/onboarding/profile?mode=create">
                        <Card className="h-full hover:shadow-md transition-all cursor-pointer border hover:border-primary">
                            <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
                                <div className="p-2 rounded-full bg-primary/10 text-primary">
                                    <Building2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                                        店舗を作成
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        新しい店舗を登録
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Join Store Option */}
                    <Link href="/onboarding/select-store">
                        <Card className="h-full hover:shadow-md transition-all cursor-pointer border hover:border-primary">
                            <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
                                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                                    <UserPlus className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                                        店舗に参加
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        招待された店舗へ
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                <div className="flex justify-center pt-4">
                    <LogoutButton />
                </div>
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
