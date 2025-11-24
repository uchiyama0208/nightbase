"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [signupMethod, setSignupMethod] = useState<"line" | "email">("line");

    // Email signup form state
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formError, setFormError] = useState("");

    const handleLineLogin = async () => {
        setLoading(true);

        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

            if (!supabaseUrl) {
                console.error("NEXT_PUBLIC_SUPABASE_URL is not defined");
                alert("設定エラー: Supabase URLが見つかりません");
                setLoading(false);
                return;
            }

            const edgeFunctionUrl = `${supabaseUrl}/functions/v1/line-auth?mode=onboarding`;
            window.location.href = edgeFunctionUrl;
        } catch (error) {
            console.error("LINE login error:", error);
            alert("ログインに失敗しました");
            setLoading(false);
        }
    };

    const validateEmailForm = () => {
        setFormError("");

        if (!email || !password || !confirmPassword) {
            setFormError("すべての項目を入力してください");
            return false;
        }

        if (password.length < 6) {
            setFormError("パスワードは6文字以上で入力してください");
            return false;
        }

        if (password !== confirmPassword) {
            setFormError("パスワードが一致しません");
            return false;
        }

        return true;
    };

    const canProceed = termsAccepted && privacyAccepted;

    return (
        <div className="container mx-auto px-4 py-8 pt-24">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Nightbaseへようこそ
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        アカウントを作成して始めましょう
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-gray-900 dark:text-white">新規登録</CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400">
                            登録方法を選択してください
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Registration Method Tabs */}
                        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <button
                                onClick={() => setSignupMethod("line")}
                                className={`flex-1 py-1.5 px-3 text-sm rounded-md transition-colors whitespace-nowrap ${signupMethod === "line"
                                    ? "bg-white dark:bg-gray-700 shadow-sm font-medium text-gray-900 dark:text-white"
                                    : "text-gray-600 dark:text-gray-400"
                                    }`}
                            >
                                LINEで登録
                            </button>
                            <button
                                onClick={() => setSignupMethod("email")}
                                className={`flex-1 py-1.5 px-3 text-sm rounded-md transition-colors whitespace-nowrap ${signupMethod === "email"
                                    ? "bg-white dark:bg-gray-700 shadow-sm font-medium text-gray-900 dark:text-white"
                                    : "text-gray-600 dark:text-gray-400"
                                    }`}
                            >
                                メールアドレスで登録
                            </button>
                        </div>

                        {signupMethod === "email" && (
                            <form action="/app/auth/signup" method="post" className="space-y-4">


                                <div>
                                    <Label htmlFor="email" className="text-gray-900 dark:text-white">
                                        メールアドレス <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="mt-1"
                                        placeholder="example@email.com"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="password" className="text-gray-900 dark:text-white">
                                        パスワード <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative mt-1">
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="pr-10"
                                            placeholder="6文字以上"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="confirmPassword" className="text-gray-900 dark:text-white">
                                        パスワード（確認） <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative mt-1">
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="pr-10"
                                            placeholder="パスワードを再入力"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                        >
                                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>

                                {formError && (
                                    <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                        {formError}
                                    </p>
                                )}

                                <div className="space-y-4">
                                    <label htmlFor="terms-email" className="flex items-start space-x-3 cursor-pointer">
                                        <Checkbox
                                            id="terms-email"
                                            checked={termsAccepted}
                                            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                                        />
                                        <div className="space-y-1">
                                            <div className="font-medium text-gray-900 dark:text-white text-sm">
                                                利用規約に同意する
                                            </div>
                                            <p className="text-xs">
                                                <Link
                                                    href="/terms-of-service"
                                                    target="_blank"
                                                    className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    利用規約を確認する
                                                </Link>
                                            </p>
                                        </div>
                                    </label>

                                    <label htmlFor="privacy-email" className="flex items-start space-x-3 cursor-pointer">
                                        <Checkbox
                                            id="privacy-email"
                                            checked={privacyAccepted}
                                            onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
                                        />
                                        <div className="space-y-1">
                                            <div className="font-medium text-gray-900 dark:text-white text-sm">
                                                プライバシーポリシーに同意する
                                            </div>
                                            <p className="text-xs">
                                                <Link
                                                    href="/privacy-policy"
                                                    target="_blank"
                                                    className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    プライバシーポリシーを確認する
                                                </Link>
                                            </p>
                                        </div>
                                    </label>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={!canProceed || loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    size="lg"
                                    onClick={(e) => {
                                        if (!validateEmailForm()) {
                                            e.preventDefault();
                                        }
                                    }}
                                >
                                    {loading ? "処理中..." : "メールアドレスで新規登録"}
                                </Button>
                                {!canProceed && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                                        両方の項目にチェックを入れてください
                                    </p>
                                )}
                            </form>
                        )}

                        {signupMethod === "line" && (
                            <div className="space-y-4">
                                <div className="space-y-4">
                                    <label htmlFor="terms" className="flex items-start space-x-3 cursor-pointer">
                                        <Checkbox
                                            id="terms"
                                            checked={termsAccepted}
                                            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                                        />
                                        <div className="space-y-1">
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                利用規約に同意する
                                            </div>
                                            <p className="text-sm">
                                                <Link
                                                    href="/terms-of-service"
                                                    target="_blank"
                                                    className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    利用規約を確認する
                                                </Link>
                                            </p>
                                        </div>
                                    </label>

                                    <label htmlFor="privacy" className="flex items-start space-x-3 cursor-pointer">
                                        <Checkbox
                                            id="privacy"
                                            checked={privacyAccepted}
                                            onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
                                        />
                                        <div className="space-y-1">
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                プライバシーポリシーに同意する
                                            </div>
                                            <p className="text-sm">
                                                <Link
                                                    href="/privacy-policy"
                                                    target="_blank"
                                                    className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    プライバシーポリシーを確認する
                                                </Link>
                                            </p>
                                        </div>
                                    </label>
                                </div>

                                <Button
                                    onClick={handleLineLogin}
                                    disabled={!canProceed || loading}
                                    className="w-full bg-[#00B900] hover:bg-[#00A000] text-white"
                                    size="lg"
                                >
                                    {loading ? "処理中..." : "LINEで新規登録"}
                                </Button>
                                {!canProceed && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                                        両方の項目にチェックを入れてください
                                    </p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="text-center">
                    <Link href="/login" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary">
                        既にアカウントをお持ちの方はこちら
                    </Link>
                </div>
            </div>
        </div>
    );
}
