"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { checkApprovalStatus, withdrawJoinRequest } from "../actions";
import { Clock, XCircle, RefreshCw, LogOut, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

interface PendingApprovalClientProps {
    status: "pending" | "rejected";
    storeName: string;
}

export function PendingApprovalClient({ status: initialStatus, storeName }: PendingApprovalClientProps) {
    const router = useRouter();
    const [status, setStatus] = useState(initialStatus);
    const [isChecking, setIsChecking] = useState(false);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

    useEffect(() => {
        if (status === "pending") {
            // Poll for status changes every 5 seconds
            const interval = setInterval(async () => {
                const result = await checkApprovalStatus();
                if (result.success && result.status) {
                    if (result.status === "approved") {
                        router.push("/app/dashboard");
                    } else if (result.status === "rejected") {
                        setStatus("rejected");
                    }
                }
            }, 5000);

            return () => clearInterval(interval);
        }
    }, [status, router]);

    const handleCheckStatus = async () => {
        setIsChecking(true);
        const result = await checkApprovalStatus();
        if (result.success && result.status) {
            if (result.status === "approved") {
                router.push("/app/dashboard");
            } else {
                setStatus(result.status as "pending" | "rejected");
            }
        }
        setIsChecking(false);
    };

    const handleWithdraw = async () => {
        setIsWithdrawing(true);
        const result = await withdrawJoinRequest();
        if (result.success) {
            router.push("/onboarding/choice");
        } else {
            alert(`エラー: ${result.error}`);
        }
        setIsWithdrawing(false);
        setShowWithdrawDialog(false);
    };

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
    };

    const handleReselectStore = () => {
        router.push("/onboarding/select-store");
    };

    if (status === "pending") {
        return (
            <>
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-pulse" />
                            <div>
                                <CardTitle className="text-gray-900 dark:text-white">承認待ち</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">
                                    管理者による承認をお待ちください
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
                            <p className="text-sm text-blue-900 dark:text-blue-100">
                                <span className="font-medium">申請先:</span> {storeName}
                            </p>
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                管理者が申請を確認次第、店舗データにアクセスできるようになります。
                            </p>
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground text-center">
                                承認されると自動的にダッシュボードに移動します
                            </p>
                            <Button
                                onClick={handleCheckStatus}
                                disabled={isChecking}
                                variant="outline"
                                className="w-full"
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? "animate-spin" : ""}`} />
                                {isChecking ? "確認中..." : "承認状況を確認"}
                            </Button>
                        </div>

                        <div className="border-t pt-4 space-y-2">
                            <Button
                                onClick={() => setShowWithdrawDialog(true)}
                                variant="ghost"
                                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                申請を取り下げる
                            </Button>
                            <Button
                                onClick={handleLogout}
                                variant="ghost"
                                className="w-full text-gray-600 dark:text-gray-400"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                ログアウト
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 取り下げ確認ダイアログ */}
                <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
                    <DialogContent className="sm:max-w-[400px] bg-white dark:bg-gray-900">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                申請を取り下げ
                            </DialogTitle>
                            <DialogDescription className="text-gray-600 dark:text-gray-400">
                                {storeName}への参加申請を取り下げますか？
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowWithdrawDialog(false)}
                                disabled={isWithdrawing}
                            >
                                キャンセル
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleWithdraw}
                                disabled={isWithdrawing}
                            >
                                {isWithdrawing ? "処理中..." : "取り下げる"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    // Rejected status
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    <div>
                        <CardTitle className="text-gray-900 dark:text-white">申請が拒否されました</CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400">
                            管理者により申請が拒否されました
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-2">
                    <p className="text-sm text-red-900 dark:text-red-100">
                        <span className="font-medium">申請先:</span> {storeName}
                    </p>
                    <p className="text-sm text-red-800 dark:text-red-200">
                        別の店舗を選択するか、店舗の管理者に直接お問い合わせください。
                    </p>
                </div>

                <Button
                    onClick={handleReselectStore}
                    className="w-full"
                >
                    店舗を選び直す
                </Button>

                <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="w-full text-gray-600 dark:text-gray-400"
                >
                    <LogOut className="h-4 w-4 mr-2" />
                    ログアウト
                </Button>
            </CardContent>
        </Card>
    );
}
