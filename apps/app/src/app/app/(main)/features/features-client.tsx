"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Info, ChevronLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { updateFeatureSettings } from "./actions";
import Link from "next/link";

// Feature keys and their display names
const FEATURE_CATEGORIES: {
    [key: string]: {
        label: string;
        features: { key: string; label: string }[];
    };
} = {
    shift: {
        label: "シフト管理",
        features: [
            { key: "show_attendance", label: "出勤管理" },
            { key: "show_pickup", label: "送迎管理" },
            { key: "show_timecard", label: "タイムカード" },
            { key: "show_shifts", label: "シフト管理" },
            { key: "show_my_shifts", label: "マイシフト" },
        ],
    },
    user: {
        label: "ユーザー",
        features: [
            { key: "show_users", label: "プロフィール情報" },
            { key: "show_resumes", label: "履歴書" },
            { key: "show_invitations", label: "招待" },
            { key: "show_roles", label: "権限" },
        ],
    },
    floor: {
        label: "フロア",
        features: [
            { key: "show_floor", label: "フロア管理" },
            { key: "show_orders", label: "注文一覧" },
            { key: "show_queue", label: "順番待ち" },
            { key: "show_reservations", label: "予約" },
            { key: "show_seats", label: "席エディター" },
            { key: "show_slips", label: "伝票" },
            { key: "show_menus", label: "メニュー" },
            { key: "show_bottles", label: "ボトルキープ" },
            { key: "show_shopping", label: "買い出し" },
        ],
    },
    store: {
        label: "料金給与",
        features: [
            { key: "show_sales", label: "売上" },
            { key: "show_payroll", label: "給与" },
            { key: "show_ranking", label: "ランキング" },
            { key: "show_pricing_systems", label: "料金システム" },
            { key: "show_salary_systems", label: "給与システム" },
        ],
    },
    community: {
        label: "コミュニティ",
        features: [
            { key: "show_board", label: "掲示板" },
            { key: "show_sns", label: "SNS投稿" },
            { key: "show_ai_create", label: "AIクリエイト" },
            { key: "show_services", label: "関連サービス" },
        ],
    },
};

interface FeaturesClientProps {
    initialSettings: Record<string, boolean>;
}

export function FeaturesClient({ initialSettings }: FeaturesClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [settings, setSettings] = useState<Record<string, boolean>>(initialSettings);

    const handleToggle = (key: string, value: boolean) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        startTransition(async () => {
            try {
                await updateFeatureSettings(settings);
                toast({
                    title: "保存しました",
                    description: "表示ページ設定を更新しました",
                });
                router.refresh();
            } catch (error) {
                toast({
                    title: "エラー",
                    description: error instanceof Error ? error.message : "保存に失敗しました",
                    variant: "destructive",
                });
            }
        });
    };

    const enabledCount = Object.values(settings).filter(Boolean).length;
    const totalCount = Object.values(FEATURE_CATEGORIES).flatMap((c) => c.features).length;

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
                <Link
                    href="/app/settings"
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    表示ページ設定
                </h1>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex gap-3">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium mb-1">非表示にしたページは:</p>
                        <ul className="list-disc list-inside space-y-0.5 text-blue-700 dark:text-blue-300">
                            <li>店舗のすべてのメンバーがアクセスできなくなります</li>
                            <li>サイドバーやダッシュボードに表示されなくなります</li>
                            <li>権限設定で自動的に「権限なし」になります</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                {Object.entries(FEATURE_CATEGORIES).map(([categoryKey, category], categoryIndex) => (
                    <div key={categoryKey}>
                        {categoryIndex > 0 && (
                            <div className="border-t border-gray-200 dark:border-gray-700" />
                        )}
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50">
                            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {category.label}
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {category.features.map((feature) => (
                                <div
                                    key={feature.key}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                                >
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {feature.label}
                                    </span>
                                    <Switch
                                        checked={settings[feature.key] ?? true}
                                        onCheckedChange={(checked) => handleToggle(feature.key, checked)}
                                        disabled={isPending}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                    {enabledCount} / {totalCount} ページを表示
                </span>
                <Button onClick={handleSave} disabled={isPending}>
                    {isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            保存中...
                        </>
                    ) : (
                        "保存する"
                    )}
                </Button>
            </div>
        </div>
    );
}
