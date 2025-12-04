"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { Users, UserCog, Building2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { submitJoinRequest } from "./actions";

interface Store {
    id: string;
    name: string;
    industry: string | null;
    prefecture: string | null;
    icon_url: string | null;
}

interface JoinFormProps {
    store: Store;
    isLoggedIn: boolean;
}

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || "https://nightbase.jp";

export function JoinForm({ store, isLoggedIn }: JoinFormProps) {
    const router = useRouter();
    const [step, setStep] = useState<"auth" | "role" | "profile">(isLoggedIn ? "role" : "auth");
    const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
    const [signupMethod, setSignupMethod] = useState<"line" | "email">("line");
    const [role, setRole] = useState<"cast" | "staff">("cast");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Terms state
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);

    // Email form state
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formError, setFormError] = useState("");
    const [loading, setLoading] = useState(false);

    const canProceed = termsAccepted && privacyAccepted;
    const redirectPath = `/join/${store.id}`;

    const handleLineAuth = () => {
        setLoading(true);
        window.location.href = `/api/line-link?mode=onboarding&redirect=${encodeURIComponent(redirectPath)}`;
    };

    const validateEmailForm = () => {
        setFormError("");

        if (!email || !password) {
            setFormError("すべての項目を入力してください");
            return false;
        }

        if (authMode === "signup") {
            if (!confirmPassword) {
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
        }

        return true;
    };

    const handleRoleSelect = () => {
        setStep("profile");
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        formData.append("store_id", store.id);
        formData.append("role", role);

        const result = await submitJoinRequest(formData);

        if (result.success) {
            router.push("/onboarding/pending-approval");
        } else {
            setError(result.error || "エラーが発生しました");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Store Info Header */}
            <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                        {store.icon_url ? (
                            <Image
                                src={store.icon_url}
                                alt={store.name}
                                width={56}
                                height={56}
                                className="rounded-2xl object-cover"
                            />
                        ) : (
                            <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/50">
                                <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {store.name}
                            </h2>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Auth Step - Show when not logged in */}
            {step === "auth" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-gray-900 dark:text-white">
                            {authMode === "signup" ? "新規登録" : "ログイン"}
                        </CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400">
                            {authMode === "signup" ? "アカウントを作成して参加申請を送信" : "既存のアカウントでログイン"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {authMode === "signup" ? (
                            <>
                                {/* Signup Method Tabs */}
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
                                        メールで登録
                                    </button>
                                </div>

                                {signupMethod === "email" ? (
                                    <form action="/app/auth/signup" method="post" className="space-y-4">
                                        <input type="hidden" name="redirect" value={redirectPath} />
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
                                                        <a
                                                            href={`${MARKETING_URL}/terms-of-service`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            利用規約を確認する
                                                        </a>
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
                                                        <a
                                                            href={`${MARKETING_URL}/privacy-policy`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            プライバシーポリシーを確認する
                                                        </a>
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
                                ) : (
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
                                                        <a
                                                            href={`${MARKETING_URL}/terms-of-service`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            利用規約を確認する
                                                        </a>
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
                                                        <a
                                                            href={`${MARKETING_URL}/privacy-policy`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            プライバシーポリシーを確認する
                                                        </a>
                                                    </p>
                                                </div>
                                            </label>
                                        </div>

                                        <Button
                                            onClick={handleLineAuth}
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

                                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                                    既にNightbaseアカウントをお持ちですか？{" "}
                                    <button
                                        type="button"
                                        onClick={() => setAuthMode("login")}
                                        className="text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        ログイン
                                    </button>
                                </p>
                            </>
                        ) : (
                            /* Login Mode */
                            <div className="space-y-4">
                                <Button
                                    onClick={handleLineAuth}
                                    className="w-full bg-[#00B900] hover:bg-[#00A000] text-white"
                                    size="lg"
                                >
                                    LINEでログイン
                                </Button>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-300 dark:border-gray-700" />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                                            またはメールアドレスでログイン
                                        </span>
                                    </div>
                                </div>

                                <form action="/app/auth/login" method="post" className="space-y-4">
                                    <input type="hidden" name="redirect" value={redirectPath} />
                                    <div>
                                        <Label htmlFor="login-email" className="text-gray-900 dark:text-white">
                                            メールアドレス
                                        </Label>
                                        <Input
                                            id="login-email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            placeholder="example@email.com"
                                            className="mt-1"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="login-password" className="text-gray-900 dark:text-white">
                                                パスワード
                                            </Label>
                                            <Link
                                                href="/forgot-password"
                                                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                            >
                                                パスワードを忘れた方
                                            </Link>
                                        </div>
                                        <div className="relative mt-1">
                                            <Input
                                                id="login-password"
                                                name="password"
                                                type={showPassword ? "text" : "password"}
                                                autoComplete="current-password"
                                                required
                                                className="pr-10"
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

                                    <Button
                                        type="submit"
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                        size="lg"
                                    >
                                        ログイン
                                    </Button>
                                </form>

                                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                                    アカウントをお持ちでないですか？{" "}
                                    <button
                                        type="button"
                                        onClick={() => setAuthMode("signup")}
                                        className="text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        新規登録
                                    </button>
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Role Selection Step */}
            {step === "role" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-gray-900 dark:text-white">
                            ロールを選択
                        </CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400">
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
                                            <div className="font-medium text-gray-900 dark:text-white">キャスト</div>
                                        </div>
                                    </Label>
                                </div>

                                <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <RadioGroupItem value="staff" id="staff" />
                                    <Label htmlFor="staff" className="flex-1 cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <UserCog className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                            <div className="font-medium text-gray-900 dark:text-white">スタッフ</div>
                                        </div>
                                    </Label>
                                </div>
                            </div>
                        </RadioGroup>

                        <Button onClick={handleRoleSelect} className="w-full">
                            次へ
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Profile Form Step */}
            {step === "profile" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-gray-900 dark:text-white">
                            プロフィール入力
                        </CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400">
                            あなたの基本情報を入力してください
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
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
                                        placeholder="やまだ はなこ"
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
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="real_name_kana" className="font-semibold text-gray-900 dark:text-white">
                                        本名（ひらがな）
                                    </Label>
                                    <Input
                                        id="real_name_kana"
                                        name="real_name_kana"
                                        placeholder="やまだ はなこ"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <p className="text-sm text-red-600 dark:text-red-400 text-center">
                                        {error}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep("role")}
                                    className="flex-1"
                                >
                                    戻る
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "送信中..." : "参加申請を送信"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
