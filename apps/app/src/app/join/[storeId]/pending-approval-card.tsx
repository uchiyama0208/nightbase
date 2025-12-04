"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

interface Store {
    id: string;
    name: string;
    industry: string | null;
    prefecture: string | null;
    icon_url: string | null;
}

interface PendingApprovalCardProps {
    store: Store;
}

export function PendingApprovalCard({ store }: PendingApprovalCardProps) {
    const router = useRouter();

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

            {/* Pending Approval Message */}
            <Card>
                <CardContent className="py-8">
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                                <Clock className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                承認待ち
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                参加申請は既に送信済みです。<br />
                                管理者の承認をお待ちください。
                            </p>
                        </div>
                        <Button
                            onClick={() => router.push("/onboarding/pending-approval")}
                            variant="outline"
                            className="w-full max-w-xs"
                            size="lg"
                        >
                            承認状況を確認
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
