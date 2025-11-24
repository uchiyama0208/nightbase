"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { searchStore } from "../actions";
import { Search, Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function SelectStoreForm() {
    const router = useRouter();
    const [storeId, setStoreId] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [storeInfo, setStoreInfo] = useState<any>(null);
    const [error, setError] = useState("");

    const handleSearch = async () => {
        if (!storeId.trim()) {
            setError("店舗IDを入力してください");
            return;
        }

        setIsSearching(true);
        setError("");
        setStoreInfo(null);

        const result = await searchStore(storeId.trim());

        if (result.success && result.store) {
            setStoreInfo(result.store);
        } else {
            setError(result.error || "店舗が見つかりませんでした");
        }

        setIsSearching(false);
    };

    const handleProceed = () => {
        if (storeInfo) {
            sessionStorage.setItem("onboarding_store_id", storeInfo.id);
            router.push("/onboarding/select-role");
        }
    };

    return (
        <Card className="relative">
            <Link
                href="/onboarding/choice"
                className="absolute top-4 left-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                戻る
            </Link>
            <CardHeader className="pt-12">
                <CardTitle className="text-gray-900 dark:text-white">店舗を選択</CardTitle>
                <CardDescription className="text-gray-700 dark:text-gray-300">
                    参加したい店舗のIDを入力してください
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="store_id">店舗ID</Label>
                        <div className="flex gap-2">
                            <Input
                                id="store_id"
                                placeholder="例: abc123..."
                                value={storeId}
                                onChange={(e) => setStoreId(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleSearch();
                                    }
                                }}
                                className="flex-1"
                            />
                            <Button
                                onClick={handleSearch}
                                disabled={isSearching}
                                variant="outline"
                                className="shrink-0"
                            >
                                <Search className="h-4 w-4 mr-2" />
                                {isSearching ? "検索中..." : "検索"}
                            </Button>
                        </div>
                        {error && (
                            <p className="text-sm text-red-600 dark:text-red-400">
                                {error}
                            </p>
                        )}
                    </div>

                    {storeInfo && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                <h3 className="font-semibold text-green-900 dark:text-green-100">
                                    店舗が見つかりました
                                </h3>
                            </div>
                            <div className="space-y-1 text-sm">
                                <p className="text-green-900 dark:text-green-100">
                                    <span className="font-medium">店舗名:</span> {storeInfo.name}
                                </p>
                                {storeInfo.industry && (
                                    <p className="text-green-800 dark:text-green-200">
                                        <span className="font-medium">業種:</span> {storeInfo.industry}
                                    </p>
                                )}
                                {storeInfo.prefecture && (
                                    <p className="text-green-800 dark:text-green-200">
                                        <span className="font-medium">所在地:</span> {storeInfo.prefecture}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t">
                    <Button
                        onClick={handleProceed}
                        disabled={!storeInfo}
                        className="w-full"
                    >
                        次へ
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
