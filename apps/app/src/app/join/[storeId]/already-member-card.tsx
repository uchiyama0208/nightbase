"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface Store {
    id: string;
    name: string;
    industry: string | null;
    prefecture: string | null;
    icon_url: string | null;
}

interface AlreadyMemberCardProps {
    store: Store;
}

export function AlreadyMemberCard({ store }: AlreadyMemberCardProps) {
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

            {/* Already Member Message */}
            <Card>
                <CardContent className="py-8">
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                既に参加しています
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                あなたは既にこの店舗のメンバーです。
                            </p>
                        </div>
                        <Button
                            onClick={() => router.push("/app/dashboard")}
                            className="w-full max-w-xs"
                            size="lg"
                        >
                            ダッシュボードへ移動
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
