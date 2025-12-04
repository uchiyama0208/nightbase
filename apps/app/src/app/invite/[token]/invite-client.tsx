"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJSTDateTime } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { acceptInvitation } from "../../app/(main)/invitations/actions";
import { useRouter } from "next/navigation";

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || "https://nightbase.jp";

interface InviteClientProps {
    invitation: {
        id: string;
        token: string;
        store_name: string;
        profile_name: string;
        expires_at: string;
        has_password: boolean;
    };
    userId?: string;
}

export function InviteClient({ invitation, userId }: InviteClientProps) {
    // Join method selection
    const [joinMethod, setJoinMethod] = useState<"line" | "email">("line");

    // Invite password (for protected invitations)
    const [invitePassword, setInvitePassword] = useState("");

    // Email signup form state
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formError, setFormError] = useState("");
    const [isLoginMode, setIsLoginMode] = useState(false); // Toggle between signup and login

    // Common state
    const [loading, setLoading] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);

    // Modal state
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    // Auto-accept state
    const [isAcceptingInvite, setIsAcceptingInvite] = useState(false);

    const router = useRouter();

    // Auto-accept invitation when user is logged in
    useEffect(() => {
        const autoAcceptInvitation = async () => {
            // Only auto-accept if:
            // 1. User is logged in (userId exists)
            // 2. Not already accepting
            // 3. Not currently in the process of signing up
            if (userId && !isAcceptingInvite && !showSuccessModal) {
                console.log("Auto-accepting invitation for logged-in user");
                setIsAcceptingInvite(true);

                try {
                    const result = await acceptInvitation(invitation.token);

                    if (result.success) {
                        // Redirect to dashboard
                        router.push("/app/dashboard");
                    } else {
                        console.error("Failed to auto-accept invitation:", result.error);
                        setIsAcceptingInvite(false);
                    }
                } catch (error) {
                    console.error("Error auto-accepting invitation:", error);
                    setIsAcceptingInvite(false);
                }
            }
        };

        autoAcceptInvitation();
    }, [userId, invitation.token, isAcceptingInvite, showSuccessModal, router]);

    const validateEmailForm = () => {
        setFormError("");

        // Login mode only requires email and password
        if (isLoginMode) {
            if (!email || !password) {
                setFormError("メールアドレスとパスワードを入力してください");
                return false;
            }
            return true;
        }

        // Signup mode requires all fields
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

        if (invitation.has_password && !invitePassword) {
            setFormError("招待パスワードを入力してください");
            return false;
        }

        return true;
    };

    const handleLineJoin = async () => {
        setLoading(true);
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            if (!supabaseUrl) {
                alert("設定エラー: Supabase URLが見つかりません");
                setLoading(false);
                return;
            }

            const edgeFunctionUrl = `${supabaseUrl}/functions/v1/line-auth?mode=join-store&invite_token=${invitation.token}`;
            window.location.href = edgeFunctionUrl;

        } catch (error) {
            console.error("Unexpected error:", error);
            alert("エラーが発生しました");
            setLoading(false);
        }
    };

    const handleEmailSignup = async () => {
        if (!validateEmailForm()) {
            return;
        }

        setLoading(true);
        setFormError("");

        try {
            const response = await fetch("/api/auth/signup-with-invite", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                    inviteToken: invitation.token,
                    invitePassword,
                    isLogin: isLoginMode,
                }),
            });

            const result = await response.json();

            if (!result.success) {
                // If existing user, switch to login mode
                if (result.existingUser) {
                    setIsLoginMode(true);
                    setFormError("このメールアドレスは既に登録されています。パスワードを入力してログインしてください。");
                } else {
                    setFormError(result.message || "登録に失敗しました");
                }
                setLoading(false);
                return;
            }

            // If login was successful, redirect to dashboard
            if (result.isLogin) {
                router.push("/app/dashboard");
                return;
            }

            setSuccessMessage(result.message || "確認メールを送信しました。メールをご確認ください。");
            setShowSuccessModal(true);
            setLoading(false);
        } catch (error) {
            console.error("Signup error:", error);
            setFormError("予期しないエラーが発生しました");
            setLoading(false);
        }
    };

    const canProceed = termsAccepted && privacyAccepted;

    // Show loading state while auto-accepting
    if (isAcceptingInvite) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
                    <p className="text-gray-600 dark:text-gray-400">招待を受諾しています...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-start pt-6 sm:justify-center sm:pt-0 bg-gray-50 dark:bg-gray-900 p-4">
            {/* Success Modal */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center text-xl">メール送信完了</DialogTitle>
                        <DialogDescription className="text-center pt-2">
                            {successMessage}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-center leading-relaxed text-muted-foreground">
                            メールに記載されているリンクをクリックして、アカウントを有効化してください。<br />
                            有効化後、自動的にこの招待を受諾し、ダッシュボードにリダイレクトされます。
                        </p>
                    </div>
                    <DialogFooter className="sm:justify-center">
                        <Button
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full sm:w-auto min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            閉じる
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card className="w-full max-w-md shadow-none sm:shadow-sm border-0 sm:border bg-transparent sm:bg-card">
                <CardHeader className="text-center space-y-1 pt-0 pb-2 sm:pt-6">
                    <div className="mx-auto w-12 h-12 bg-[#06C755]/10 rounded-full flex items-center justify-center mb-1">
                        <svg
                            className="w-6 h-6 text-[#06C755]"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M12 2.5C6.6 2.5 2.5 6.2 2.5 10.8c0 2.6 1.3 4.9 3.4 6.4 0.3 0.2 0.4 0.5 0.3 0.8 -0.1 0.9 -0.4 3.2 -0.4 3.4 0 0.3 0.2 0.5 0.5 0.5 0.2 0 2.6 -0.5 5.4 -1.9 0.1 -0.1 0.3 -0.1 0.4 -0.1 0.1 0 0.2 0 0.3 0 5.4 0 9.5 -3.7 9.5 -8.3C21.5 6.2 17.4 2.5 12 2.5z" />
                        </svg>
                    </div>
                    <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">店舗への招待</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        以下の店舗から招待が届いています
                    </p>
                </CardHeader>
                <CardContent className="space-y-6 px-0 sm:px-6">
                    <div className="space-y-4 bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">店舗名</span>
                            <span className="font-medium text-gray-900 dark:text-white">{invitation.store_name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">名前</span>
                            <span className="font-medium text-gray-900 dark:text-white">{invitation.profile_name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">有効期限</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                                {formatJSTDateTime(invitation.expires_at)}
                            </span>
                        </div>
                    </div>

                    {/* Join Method Selection Tabs */}
                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <button
                            onClick={() => setJoinMethod("line")}
                            className={`flex-1 py-1.5 px-3 text-sm rounded-md transition-colors whitespace-nowrap ${joinMethod === "line"
                                ? "bg-white dark:bg-gray-700 shadow-sm font-medium text-gray-900 dark:text-white"
                                : "text-gray-600 dark:text-gray-400"
                                }`}
                        >
                            LINEで参加
                        </button>
                        <button
                            onClick={() => setJoinMethod("email")}
                            className={`flex-1 py-1.5 px-3 text-sm rounded-md transition-colors whitespace-nowrap ${joinMethod === "email"
                                ? "bg-white dark:bg-gray-700 shadow-sm font-medium text-gray-900 dark:text-white"
                                : "text-gray-600 dark:text-gray-400"
                                }`}
                        >
                            メールアドレスで参加
                        </button>
                    </div>

                    {/* Email Signup Form */}
                    {joinMethod === "email" && (
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="email" className="text-gray-900 dark:text-white">
                                    メールアドレス <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="example@email.com"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="signup-password" className="text-gray-900 dark:text-white">
                                    パスワード <span className="text-red-500">*</span>
                                </Label>
                                <div className="relative mt-1">
                                    <Input
                                        id="signup-password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="6文字以上"
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

                            {/* Only show confirm password in signup mode */}
                            {!isLoginMode && (
                                <div>
                                    <Label htmlFor="confirm-password" className="text-gray-900 dark:text-white">
                                        パスワード（確認） <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative mt-1">
                                        <Input
                                            id="confirm-password"
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="パスワードを再入力"
                                            className="pr-10"
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
                            )}

                            {formError && (
                                <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                    {formError}
                                </p>
                            )}

                            {/* Toggle between signup and login mode */}
                            {isLoginMode && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsLoginMode(false);
                                        setFormError("");
                                    }}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    新規登録に戻る
                                </button>
                            )}
                        </div>
                    )}

                    {/* Invite Password (for protected invitations) */}
                    {invitation.has_password && (
                        <div className="space-y-2">
                            <Label htmlFor="invite-password">招待パスワード</Label>
                            <Input
                                id="invite-password"
                                type="password"
                                placeholder="パスワードを入力してください"
                                value={invitePassword}
                                onChange={(e) => setInvitePassword(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                ※この招待にはパスワードが設定されています
                            </p>
                        </div>
                    )}

                    {/* Terms and Privacy */}
                    <div className="space-y-4 pt-2">
                        <label htmlFor="terms" className="flex items-start space-x-3 cursor-pointer">
                            <Checkbox
                                id="terms"
                                checked={termsAccepted}
                                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                            />
                            <div className="space-y-1">
                                <div className="font-medium text-sm text-gray-900 dark:text-white">
                                    利用規約に同意する
                                </div>
                                <p className="text-xs">
                                    <Link
                                        href={`${MARKETING_URL}/terms-of-service`}
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
                                <div className="font-medium text-sm text-gray-900 dark:text-white">
                                    プライバシーポリシーに同意する
                                </div>
                                <p className="text-xs">
                                    <Link
                                        href={`${MARKETING_URL}/privacy-policy`}
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
                </CardContent>
                <CardFooter>
                    {joinMethod === "line" ? (
                        <Button
                            className="w-full bg-[#06C755] hover:bg-[#05b54b] text-white font-bold"
                            size="lg"
                            onClick={handleLineJoin}
                            disabled={(invitation.has_password && !invitePassword) || !canProceed || loading}
                        >
                            {loading ? "処理中..." : "LINEで参加する"}
                        </Button>
                    ) : (
                        <div className="w-full space-y-2">
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                size="lg"
                                onClick={handleEmailSignup}
                                disabled={!canProceed || loading}
                            >
                                {loading ? "処理中..." : "メールアドレスで新規登録"}
                            </Button>
                            {!canProceed && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                                    両方の項目にチェックを入れてください
                                </p>
                            )}
                        </div>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
