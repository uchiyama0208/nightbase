"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { checkApprovalStatus } from "../actions";
import { Clock, XCircle, RefreshCw } from "lucide-react";

interface PendingApprovalClientProps {
    status: "pending" | "rejected";
    storeName: string;
}

export function PendingApprovalClient({ status: initialStatus, storeName }: PendingApprovalClientProps) {
    const router = useRouter();
    const [status, setStatus] = useState(initialStatus);
    const [isChecking, setIsChecking] = useState(false);

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

    const handleReselectStore = () => {
        router.push("/onboarding/select-store");
    };

    if (status === "pending") {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-pulse" />
                        <div>
                            <CardTitle>承認待ち</CardTitle>
                            <CardDescription>
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
                </CardContent>
            </Card>
        );
    }

    // Rejected status
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    <div>
                        <CardTitle>申請が拒否されました</CardTitle>
                        <CardDescription>
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
            </CardContent>
        </Card>
    );
}
