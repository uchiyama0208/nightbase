"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || "https://nightbase.jp";

export default function SignupPage() {
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirect");
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [signupMethod, setSignupMethod] = useState<"line" | "email">("line");

    // Vercel-style tabs
    const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    useEffect(() => {
        const activeButton = tabsRef.current[signupMethod];
        if (activeButton) {
            setIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
            });
        }
    }, [signupMethod]);

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
            let lineAuthUrl = "/api/line-link?mode=onboarding";
            if (redirectTo) {
                lineAuthUrl += `&redirect=${encodeURIComponent(redirectTo)}`;
            }
            window.location.href = lineAuthUrl;
        } catch (error) {
            console.error("LINE login error:", error);
            toast({ title: "ログインに失敗しました", variant: "destructive" });
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
        <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-md mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        新規登録
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        アカウントを作成して始めましょう
                    </p>
                </div>

                <Card className="border-gray-200 dark:border-gray-700">
                    <CardContent className="pt-6 space-y-6">
                        {/* Registration Method Tabs - Vercel Style */}
                        <div className="relative">
                            <div className="flex w-full">
                                <button
                                    ref={(el) => { tabsRef.current["line"] = el; }}
                                    type="button"
                                    onClick={() => setSignupMethod("line")}
                                    className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                                        signupMethod === "line"
                                            ? "text-gray-900 dark:text-white"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                    }`}
                                >
                                    LINEで登録
                                </button>
                                <button
                                    ref={(el) => { tabsRef.current["email"] = el; }}
                                    type="button"
                                    onClick={() => setSignupMethod("email")}
                                    className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                                        signupMethod === "email"
                                            ? "text-gray-900 dark:text-white"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                    }`}
                                >
                                    メールで登録
                                </button>
                            </div>
                            <div
                                className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-200"
                                style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                            />
                            <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
                        </div>

                        {signupMethod === "email" && (
                            <form action="/app/auth/signup" method="post" className="space-y-4">
                                {redirectTo && (
                                    <input type="hidden" name="redirect" value={redirectTo} />
                                )}
                                <div>
                                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-200">
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
                                    <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-200">
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
                                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-200">
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
                                    <label htmlFor="terms-email" className="flex items-center space-x-3 cursor-pointer">
                                        <Checkbox
                                            id="terms-email"
                                            checked={termsAccepted}
                                            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                                        />
                                        <span className="text-sm text-gray-900 dark:text-white">
                                            <Link
                                                href={`${MARKETING_URL}/terms-of-service`}
                                                target="_blank"
                                                className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                利用規約
                                            </Link>
                                            に同意する
                                        </span>
                                    </label>

                                    <label htmlFor="privacy-email" className="flex items-center space-x-3 cursor-pointer">
                                        <Checkbox
                                            id="privacy-email"
                                            checked={privacyAccepted}
                                            onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
                                        />
                                        <span className="text-sm text-gray-900 dark:text-white">
                                            <Link
                                                href={`${MARKETING_URL}/privacy-policy`}
                                                target="_blank"
                                                className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                プライバシーポリシー
                                            </Link>
                                            に同意する
                                        </span>
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
                                    <label htmlFor="terms" className="flex items-center space-x-3 cursor-pointer">
                                        <Checkbox
                                            id="terms"
                                            checked={termsAccepted}
                                            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                                        />
                                        <span className="text-sm text-gray-900 dark:text-white">
                                            <Link
                                                href={`${MARKETING_URL}/terms-of-service`}
                                                target="_blank"
                                                className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                利用規約
                                            </Link>
                                            に同意する
                                        </span>
                                    </label>

                                    <label htmlFor="privacy" className="flex items-center space-x-3 cursor-pointer">
                                        <Checkbox
                                            id="privacy"
                                            checked={privacyAccepted}
                                            onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
                                        />
                                        <span className="text-sm text-gray-900 dark:text-white">
                                            <Link
                                                href={`${MARKETING_URL}/privacy-policy`}
                                                target="_blank"
                                                className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                プライバシーポリシー
                                            </Link>
                                            に同意する
                                        </span>
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

                        {/* Login link */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-2">
                            <div className="text-center space-y-1">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    既にアカウントをお持ちですか？
                                </p>
                                <Link href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login"} className="block text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                                    ログイン
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';
