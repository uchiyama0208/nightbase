"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Link2, Link2Off, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { type SnsAccount, disconnectSnsAccount } from "./actions";

interface AccountSettingsProps {
    accounts: SnsAccount[];
    storeId: string;
}

const PLATFORMS = [
    {
        id: "x" as const,
        name: "X (Twitter)",
        icon: (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
        ),
        description: "Xアカウントを連携して投稿を自動化",
        connectUrl: "/api/auth/sns/x", // OAuth開始URL（将来実装）
    },
    {
        id: "instagram" as const,
        name: "Instagram",
        icon: (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
        ),
        description: "Instagramアカウントを連携して投稿・ストーリーを自動化",
        connectUrl: "/api/auth/sns/instagram", // OAuth開始URL（将来実装）
    },
];

export function AccountSettings({ accounts, storeId }: AccountSettingsProps) {
    const router = useRouter();
    const [disconnecting, setDisconnecting] = useState<string | null>(null);
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
    const [disconnectingPlatform, setDisconnectingPlatform] = useState<"x" | "instagram" | null>(null);

    const getAccountByPlatform = (platform: "x" | "instagram") => {
        return accounts.find((a) => a.platform === platform && a.is_connected);
    };

    const handleConnect = (platform: "x" | "instagram") => {
        // OAuth認証フローを開始
        // 現時点ではAPIが未実装のため、アラートを表示
        alert(`${platform === "x" ? "X" : "Instagram"}の連携機能は現在準備中です。\nAPI設定が完了次第、利用可能になります。`);
        // 将来的には: window.location.href = `/api/auth/sns/${platform}?store_id=${storeId}`;
    };

    const handleDisconnectClick = (platform: "x" | "instagram") => {
        setDisconnectingPlatform(platform);
        setShowDisconnectConfirm(true);
    };

    const handleDisconnect = async () => {
        if (!disconnectingPlatform) return;

        setDisconnecting(disconnectingPlatform);
        try {
            await disconnectSnsAccount(disconnectingPlatform);
            router.refresh();
        } catch (error) {
            console.error("Error disconnecting:", error);
        } finally {
            setDisconnecting(null);
            setShowDisconnectConfirm(false);
            setDisconnectingPlatform(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    アカウント連携
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    SNSアカウントを連携して投稿を自動化
                </p>
            </div>

            {/* Info Banner */}
            <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
                <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium">OAuth認証について</p>
                        <p className="mt-1">
                            アカウントを連携すると、このアプリから直接SNSに投稿できるようになります。
                            連携時に必要な権限のみを要求します。いつでも連携を解除できます。
                        </p>
                    </div>
                </div>
            </div>

            {/* Account Cards */}
            <div className="space-y-3">
                {PLATFORMS.map((platform) => {
                    const account = getAccountByPlatform(platform.id);
                    const isConnected = !!account;

                    return (
                        <div
                            key={platform.id}
                            className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div
                                        className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                                            isConnected
                                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                                        }`}
                                    >
                                        {platform.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">
                                            {platform.name}
                                        </h3>
                                        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                                            {platform.description}
                                        </p>
                                        {isConnected && account?.account_name && (
                                            <p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                                                連携中: @{account.account_name}
                                            </p>
                                        )}
                                        {isConnected && !account?.account_name && (
                                            <p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                                                ✓ 連携済み
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    {isConnected ? (
                                        <Button
                                            variant="outline"
                                            onClick={() => handleDisconnectClick(platform.id)}
                                            disabled={disconnecting === platform.id}
                                            className="rounded-lg gap-2 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            {disconnecting === platform.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Link2Off className="h-4 w-4" />
                                            )}
                                            連携解除
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => handleConnect(platform.id)}
                                            className="rounded-lg gap-2"
                                        >
                                            <Link2 className="h-4 w-4" />
                                            連携する
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Setup Guide */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                    連携手順
                </h3>
                <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-xs font-medium text-blue-700 dark:text-blue-300">
                            1
                        </span>
                        <span>「連携する」ボタンをクリック</span>
                    </li>
                    <li className="flex gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-xs font-medium text-blue-700 dark:text-blue-300">
                            2
                        </span>
                        <span>SNSのログイン画面が表示されるので、投稿に使用するアカウントでログイン</span>
                    </li>
                    <li className="flex gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-xs font-medium text-blue-700 dark:text-blue-300">
                            3
                        </span>
                        <span>アプリへのアクセスを許可</span>
                    </li>
                    <li className="flex gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-xs font-medium text-blue-700 dark:text-blue-300">
                            4
                        </span>
                        <span>連携完了！投稿作成画面から投稿できるようになります</span>
                    </li>
                </ol>
            </div>

            {/* Disconnect Confirmation Dialog */}
            <Dialog open={showDisconnectConfirm} onOpenChange={setShowDisconnectConfirm}>
                <DialogContent className="max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-50">
                            連携を解除
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {disconnectingPlatform === "x" ? "X" : "Instagram"}との連携を解除しますか？
                        解除すると、予約投稿や自動投稿ができなくなります。
                    </p>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowDisconnectConfirm(false)}
                            disabled={!!disconnecting}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDisconnect}
                            disabled={!!disconnecting}
                            className="rounded-lg"
                        >
                            {disconnecting ? "解除中..." : "連携解除"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
