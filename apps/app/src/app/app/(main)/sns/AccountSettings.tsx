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

const PLATFORM = {
    id: "x" as const,
    name: "X (Twitter)",
    icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    ),
    description: "Xアカウントを連携して投稿を自動化",
};

export function AccountSettings({ accounts, storeId }: AccountSettingsProps) {
    const router = useRouter();
    const [disconnecting, setDisconnecting] = useState(false);
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

    const xAccount = accounts.find((a) => a.platform === "x" && a.is_connected);
    const isConnected = !!xAccount;

    const handleConnect = () => {
        // OAuth認証フローを開始
        window.location.href = `/api/auth/x`;
    };

    const handleDisconnectClick = () => {
        setShowDisconnectConfirm(true);
    };

    const handleDisconnect = async () => {
        setDisconnecting(true);
        try {
            await disconnectSnsAccount("x");
            router.refresh();
        } catch (error) {
            console.error("Error disconnecting:", error);
        } finally {
            setDisconnecting(false);
            setShowDisconnectConfirm(false);
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
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">OAuth認証について</p>
                        <p className="mt-1">
                            アカウントを連携すると、このアプリから直接SNSに投稿できるようになります。
                            連携時に必要な権限のみを要求します。いつでも連携を解除できます。
                        </p>
                    </div>
                </div>
            </div>

            {/* Account Card */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div
                            className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                                isConnected
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                            }`}
                        >
                            {PLATFORM.icon}
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                                {PLATFORM.name}
                            </h3>
                            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                                {PLATFORM.description}
                            </p>
                            {isConnected && xAccount?.account_name && (
                                <p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                                    連携中: @{xAccount.account_name}
                                </p>
                            )}
                            {isConnected && !xAccount?.account_name && (
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
                                onClick={handleDisconnectClick}
                                disabled={disconnecting}
                                className="rounded-lg gap-2 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                {disconnecting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Link2Off className="h-4 w-4" />
                                )}
                                連携解除
                            </Button>
                        ) : (
                            <Button
                                onClick={handleConnect}
                                className="rounded-lg gap-2"
                            >
                                <Link2 className="h-4 w-4" />
                                連携する
                            </Button>
                        )}
                    </div>
                </div>
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
                <DialogContent className="sm:max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
                            連携を解除
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Xとの連携を解除しますか？
                        解除すると、予約投稿や自動投稿ができなくなります。
                    </p>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowDisconnectConfirm(false)}
                            disabled={disconnecting}
                            className="rounded-lg"
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDisconnect}
                            disabled={disconnecting}
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
