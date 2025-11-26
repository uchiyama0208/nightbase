"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useRouter } from "next/navigation";
import { Users, UserCog, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function SelectRoleForm() {
    const router = useRouter();
    const [role, setRole] = useState<"cast" | "staff">("cast");
    const [storeName, setStoreName] = useState("");

    useEffect(() => {
        // Get store info from sessionStorage (set in select-store page)
        const storeId = sessionStorage.getItem("onboarding_store_id");
        if (!storeId) {
            router.push("/onboarding/select-store");
        }
    }, [router]);

    const handleProceed = () => {
        sessionStorage.setItem("onboarding_role", role);
        router.push("/onboarding/profile?mode=join");
    };

    return (
        <Card className="relative">
            <Link
                href="/onboarding/select-store"
                className="absolute top-4 left-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                戻る
            </Link>
            <CardHeader className="pt-12">
                <CardTitle className="text-gray-900 dark:text-white">ロールを選択</CardTitle>
                <CardDescription className="text-gray-700 dark:text-gray-300">
                    あなたの役割を選択してください
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <RadioGroup value={role} onValueChange={(value) => setRole(value as "cast" | "staff")}>
                    <div className="space-y-3">
                        <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <RadioGroupItem value="cast" id="cast" />
                            <Label htmlFor="cast" className="flex-1 cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                    <div>
                                        <div className="font-medium">キャスト</div>
                                        <div className="text-sm text-muted-foreground">
                                            出勤・退勤の記録、自分のプロフィール管理
                                        </div>
                                    </div>
                                </div>
                            </Label>
                        </div>

                        <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <RadioGroupItem value="staff" id="staff" />
                            <Label htmlFor="staff" className="flex-1 cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <UserCog className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    <div>
                                        <div className="font-medium">スタッフ</div>
                                        <div className="text-sm text-muted-foreground">
                                            キャストの管理、勤怠管理、各種設定
                                        </div>
                                    </div>
                                </div>
                            </Label>
                        </div>
                    </div>
                </RadioGroup>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                        💡 管理者が申請を確認する際に、ロールを変更することができます
                    </p>
                </div>

                <div className="pt-4 border-t">
                    <Button onClick={handleProceed} className="w-full">
                        次へ
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
