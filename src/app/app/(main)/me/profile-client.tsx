"use client";

import { useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { Sun, Moon, Mail, Lock, MessageCircle, AlertCircle, ChevronRight, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { updateUserEmail, updateUserPassword, enableEmailLogin } from "./actions";

interface ProfileClientProps {
    initialEmail: string;
    initialName: string;
    identities: any[];
    userId: string;
    lineUserId?: string | null;
}

export function ProfileClient({ initialEmail, initialName, identities, userId, lineUserId }: ProfileClientProps) {
    const { theme, setTheme } = useTheme();

    const [email, setEmail] = useState(initialEmail);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showEmailEdit, setShowEmailEdit] = useState(false);
    const [showPasswordEdit, setShowPasswordEdit] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // State for enabling email login (LINE users)
    const [showEnableLogin, setShowEnableLogin] = useState(false);
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginConfirmPassword, setLoginConfirmPassword] = useState("");
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showLoginConfirmPassword, setShowLoginConfirmPassword] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Debug logging
    console.log("ProfileClient - lineUserId:", lineUserId);
    console.log("ProfileClient - identities:", identities);

    // Check if LINE is linked by checking user identities OR lineUserId
    // Supabase stores OAuth providers in identities array, but we also store it in profiles
    const isLineLinked = !!lineUserId || identities.some(
        (identity) =>
            identity.provider === "line" ||
            (identity.provider === "oauth" && identity.identity_data?.provider === "line")
    );

    // Check if user has a placeholder email (LINE login only)
    const isLinePlaceholderEmail = initialEmail && initialEmail.endsWith("@line.nightbase.app");

    console.log("ProfileClient - isLineLinked:", isLineLinked);
    console.log("ProfileClient - isLinePlaceholderEmail:", isLinePlaceholderEmail);

    const handleLineLink = () => {
        // Use Next.js API route to avoid JWT verification issues
        const apiUrl = `/api/line-link?mode=link&userId=${userId}`;
        console.log("Navigating to:", apiUrl);
        window.location.href = apiUrl;
    };

    const handleEnableEmailLogin = async () => {
        if (!loginEmail) {
            setErrorMessage("メールアドレスを入力してください");
            setShowErrorModal(true);
            return;
        }
        if (!loginPassword || loginPassword.length < 6) {
            setErrorMessage("パスワードは6文字以上で入力してください");
            setShowErrorModal(true);
            return;
        }
        if (loginPassword !== loginConfirmPassword) {
            setErrorMessage("パスワードが一致しません");
            setShowErrorModal(true);
            return;
        }

        setLoading(true);
        const result = await enableEmailLogin(loginEmail, loginPassword);
        setLoading(false);

        if (result.success) {
            setSuccessMessage("メールアドレスとパスワードでのログインを有効にしました。");
            setShowSuccessModal(true);
            setShowEnableLogin(false);
        } else {
            setErrorMessage(result.error || "エラーが発生しました");
            setShowErrorModal(true);
        }
    };

    const handleEmailUpdate = async () => {
        if (!email || email === initialEmail) {
            setErrorMessage("新しいメールアドレスを入力してください");
            setShowErrorModal(true);
            return;
        }

        setLoading(true);
        const result = await updateUserEmail(email);
        setLoading(false);

        if (result.success) {
            setSuccessMessage("メールアドレスを更新しました。");
            setShowSuccessModal(true);
            setShowEmailEdit(false);
        } else {
            setErrorMessage(result.error || "エラーが発生しました");
            setShowErrorModal(true);
        }
    };

    const handlePasswordUpdate = async () => {
        if (!newPassword || newPassword.length < 6) {
            setErrorMessage("パスワードは6文字以上で入力してください");
            setShowErrorModal(true);
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrorMessage("パスワードが一致しません");
            setShowErrorModal(true);
            return;
        }

        setLoading(true);
        const result = await updateUserPassword(newPassword);
        setLoading(false);

        if (result.success) {
            setSuccessMessage("パスワードを更新しました。");
            setShowSuccessModal(true);
            setNewPassword("");
            setConfirmPassword("");
            setShowPasswordEdit(false);
        } else {
            setErrorMessage(result.error || "エラーが発生しました");
            setShowErrorModal(true);
        }
    };

    return (
        <div className="space-y-8">
            {/* Theme Settings */}
            <div>
                <div className="px-4 pb-2">
                    <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">表示設定</h2>
                </div>
                <div className="bg-white dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setTheme("light")}
                        className="w-full flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                    >
                        <div className={`p-2 rounded-lg ${theme === "light" ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-gray-100 dark:bg-gray-700"}`}>
                            <Sun className={`h-5 w-5 ${theme === "light" ? "text-yellow-600 dark:text-yellow-400" : "text-gray-600 dark:text-gray-400"}`} />
                        </div>
                        <div className="ml-3 flex-1 text-left">
                            <h3 className="text-base font-medium text-gray-900 dark:text-white">ライトモード</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">明るいテーマで表示</p>
                        </div>
                        {theme === "light" && (
                            <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        )}
                    </button>

                    <div className="ml-16 border-b border-gray-200 dark:border-gray-700" />

                    <button
                        onClick={() => setTheme("dark")}
                        className="w-full flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                    >
                        <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-indigo-100 dark:bg-indigo-900/30" : "bg-gray-100 dark:bg-gray-700"}`}>
                            <Moon className={`h-5 w-5 ${theme === "dark" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-600 dark:text-gray-400"}`} />
                        </div>
                        <div className="ml-3 flex-1 text-left">
                            <h3 className="text-base font-medium text-gray-900 dark:text-white">ダークモード</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">暗いテーマで表示</p>
                        </div>
                        {theme === "dark" && (
                            <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        )}
                    </button>
                </div>
            </div>

            {/* Account Settings */}
            <div>
                <div className="px-4 pb-2">
                    <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">アカウント</h2>
                </div>
                <div className="bg-white dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700">
                    {/* LINE Linking */}
                    <div className="w-full px-4 py-3">
                        <div className="flex items-start">
                            <div className={`p-2 rounded-lg ${isLineLinked ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-700"}`}>
                                <MessageCircle className={`h-5 w-5 ${isLineLinked ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}`} />
                            </div>
                            <div className="ml-3 flex-1">
                                <h3 className="text-base font-medium text-gray-900 dark:text-white">LINE連携</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    {isLineLinked ? "連携済み - LINEアカウントでログイン可能です" : "LINEアカウントと連携すると、LINEでログインできるようになります"}
                                </p>
                                {!isLineLinked ? (
                                    <Button
                                        onClick={handleLineLink}
                                        className="mt-2 bg-[#00B900] hover:bg-[#00A000] text-white h-8 text-xs"
                                        size="sm"
                                    >
                                        LINE連携する
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleLineLink}
                                        variant="outline"
                                        className="mt-2 h-8 text-xs"
                                        size="sm"
                                    >
                                        別のLINEアカウントで再連携
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="ml-16 border-b border-gray-200 dark:border-gray-700" />

                    {/* Conditional Rendering: Enable Email Login vs Standard Update */}
                    {isLinePlaceholderEmail ? (
                        <>
                            {/* Enable Email Login for LINE Users */}
                            <button
                                onClick={() => setShowEnableLogin(!showEnableLogin)}
                                className="w-full flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                            >
                                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                                    <Mail className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                </div>
                                <div className="ml-3 flex-1 text-left min-w-0">
                                    <h3 className="text-base font-medium text-gray-900 dark:text-white">メール・パスワードログイン</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                        メールアドレスとパスワードでのログインを有効にする
                                    </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                            </button>

                            {showEnableLogin && (
                                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                                    <div className="space-y-3">
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                                            <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                <span>
                                                    現在LINEアカウントのみでログイン可能です。
                                                    メールアドレスとパスワードを設定すると、それらを使ってもログインできるようになります。
                                                </span>
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">メールアドレス</label>
                                            <Input
                                                type="email"
                                                value={loginEmail}
                                                onChange={(e) => setLoginEmail(e.target.value)}
                                                placeholder="example@example.com"
                                                className="w-full"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">パスワード</label>
                                            <div className="relative">
                                                <Input
                                                    type={showLoginPassword ? "text" : "password"}
                                                    value={loginPassword}
                                                    onChange={(e) => setLoginPassword(e.target.value)}
                                                    placeholder="新しいパスワード（6文字以上）"
                                                    className="w-full pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                                >
                                                    {showLoginPassword ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">パスワード（確認）</label>
                                            <div className="relative">
                                                <Input
                                                    type={showLoginConfirmPassword ? "text" : "password"}
                                                    value={loginConfirmPassword}
                                                    onChange={(e) => setLoginConfirmPassword(e.target.value)}
                                                    placeholder="パスワード確認"
                                                    className="w-full pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowLoginConfirmPassword(!showLoginConfirmPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                                >
                                                    {showLoginConfirmPassword ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 pt-2">
                                            <Button
                                                onClick={handleEnableEmailLogin}
                                                disabled={loading || !loginEmail || !loginPassword}
                                                className="w-full"
                                                size="sm"
                                            >
                                                設定する
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setShowEnableLogin(false);
                                                    setLoginEmail("");
                                                    setLoginPassword("");
                                                    setLoginConfirmPassword("");
                                                }}
                                                variant="outline"
                                                className="w-full"
                                                size="sm"
                                            >
                                                キャンセル
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Standard Email Address Update */}
                            <button
                                onClick={() => setShowEmailEdit(!showEmailEdit)}
                                className="w-full flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                            >
                                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                                    <Mail className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                </div>
                                <div className="ml-3 flex-1 text-left min-w-0">
                                    <h3 className="text-base font-medium text-gray-900 dark:text-white">メールアドレス</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                        {initialEmail || "未設定"}
                                    </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                            </button>

                            {showEmailEdit && (
                                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                                    <div className="space-y-3">
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="example@example.com"
                                            className="w-full"
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleEmailUpdate}
                                                disabled={loading || email === initialEmail}
                                                className="flex-1"
                                                size="sm"
                                            >
                                                更新
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setShowEmailEdit(false);
                                                    setEmail(initialEmail);
                                                }}
                                                variant="outline"
                                                size="sm"
                                            >
                                                キャンセル
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="ml-16 border-b border-gray-200 dark:border-gray-700" />

                            {/* Standard Password Update */}
                            <button
                                onClick={() => setShowPasswordEdit(!showPasswordEdit)}
                                className="w-full flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                            >
                                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                                    <Lock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                </div>
                                <div className="ml-3 flex-1 text-left">
                                    <h3 className="text-base font-medium text-gray-900 dark:text-white">パスワード</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">変更</p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                            </button>

                            {showPasswordEdit && (
                                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <Input
                                                type={showNewPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="新しいパスワード（6文字以上）"
                                                className="w-full pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                            >
                                                {showNewPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <Input
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="パスワード確認"
                                                className="w-full pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handlePasswordUpdate}
                                                disabled={loading || !newPassword}
                                                className="flex-1"
                                                size="sm"
                                            >
                                                更新
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setShowPasswordEdit(false);
                                                    setNewPassword("");
                                                    setConfirmPassword("");
                                                }}
                                                variant="outline"
                                                size="sm"
                                            >
                                                キャンセル
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Success Modal */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-600">
                            <Check className="h-5 w-5" />
                            完了
                        </DialogTitle>
                        <DialogDescription className="pt-2 whitespace-pre-line text-gray-700 dark:text-gray-700">
                            {successMessage}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center">
                        <Button
                            type="button"
                            className="w-full sm:w-auto"
                            onClick={() => setShowSuccessModal(false)}
                        >
                            閉じる
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Error Modal */}
            <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-600">
                            <AlertCircle className="h-5 w-5" />
                            エラー
                        </DialogTitle>
                        <DialogDescription className="pt-2 whitespace-pre-line text-gray-700 dark:text-gray-700">
                            {errorMessage}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center">
                        <Button
                            type="button"
                            className="w-full sm:w-auto"
                            onClick={() => setShowErrorModal(false)}
                        >
                            閉じる
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
