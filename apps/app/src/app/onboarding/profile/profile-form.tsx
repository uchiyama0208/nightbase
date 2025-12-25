"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface ProfileFormProps {
    mode: string;
    initialData?: {
        display_name: string;
        display_name_kana: string;
        real_name: string | null;
        real_name_kana: string | null;
    } | null;
}

export function ProfileForm({ mode, initialData }: ProfileFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        formData.append("mode", mode);

        if (mode === "create") {
            // Save to database using upsertOwnerProfile
            const { upsertOwnerProfile } = await import("../actions");
            const result = await upsertOwnerProfile(formData);

            if (result.success) {
                router.push("/onboarding/store-info");
            } else {
                toast({ title: `エラー: ${result.error}`, variant: "destructive" });
                setIsSubmitting(false);
            }
        } else {
            // For join mode, get store_id and role from sessionStorage
            const storeId = sessionStorage.getItem("onboarding_store_id");
            const role = sessionStorage.getItem("onboarding_role");

            if (!storeId || !role) {
                toast({ title: "店舗またはロール情報が見つかりません。最初からやり直してください。", variant: "destructive" });
                router.push("/onboarding/select-store");
                return;
            }

            formData.append("store_id", storeId);
            formData.append("role", role);

            const { createPendingProfile } = await import("../actions");
            const result = await createPendingProfile(formData);

            if (result.success) {
                // Clear sessionStorage
                sessionStorage.removeItem("onboarding_store_id");
                sessionStorage.removeItem("onboarding_role");
                router.push("/onboarding/pending-approval");
            } else {
                toast({ title: `エラー: ${result.error}`, variant: "destructive" });
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link
                href="/onboarding/choice"
                className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
                <ChevronLeft className="h-5 w-5 mr-1" />
                戻る
            </Link>

            {/* Custom Header */}
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    プロフィール作成
                </h1>
                <p className="text-base text-gray-700 dark:text-gray-300">
                    あなたの基本情報を入力してください
                </p>
            </div>

            {/* Form Card */}
            <Card className="border">
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="display_name" className="font-semibold text-gray-900 dark:text-white">
                                    表示名 *
                                </Label>
                                <Input
                                    id="display_name"
                                    name="display_name"
                                    placeholder="山田 花子"
                                    defaultValue={initialData?.display_name}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="display_name_kana" className="font-semibold text-gray-900 dark:text-white">
                                    表示名（ひらがな） *
                                </Label>
                                <Input
                                    id="display_name_kana"
                                    name="display_name_kana"
                                    placeholder="やまだ たろう"
                                    defaultValue={initialData?.display_name_kana}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="real_name" className="font-semibold text-gray-900 dark:text-white">
                                    本名
                                </Label>
                                <Input
                                    id="real_name"
                                    name="real_name"
                                    placeholder="山田 花子"
                                    defaultValue={initialData?.real_name || ""}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="real_name_kana" className="font-semibold text-gray-900 dark:text-white">
                                    本名（ひらがな）
                                </Label>
                                <Input
                                    id="real_name_kana"
                                    name="real_name_kana"
                                    placeholder="やまだ たろう"
                                    defaultValue={initialData?.real_name_kana || ""}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? "処理中..." : mode === "create" ? "次へ" : "登録完了"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
