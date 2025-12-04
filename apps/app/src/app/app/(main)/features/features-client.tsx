"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface FeatureFlags {
    show_dashboard: boolean;
    show_attendance: boolean;
    show_timecard: boolean;
    show_users: boolean;
    show_roles: boolean;
    show_menus: boolean;
}

interface FeaturesClientProps {
    initialFlags: FeatureFlags;
    updateFeature: (feature: string, value: boolean) => Promise<void>;
}

export function FeaturesClient({ initialFlags, updateFeature }: FeaturesClientProps) {
    const [flags, setFlags] = useState<FeatureFlags>(initialFlags);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleToggle = async (feature: keyof FeatureFlags) => {
        const newValue = !flags[feature];

        // 楽観的更新
        setFlags(prev => ({ ...prev, [feature]: newValue }));

        // サーバーアクションを呼び出し
        startTransition(async () => {
            try {
                await updateFeature(feature, newValue);
                router.refresh();
            } catch (error) {
                // エラーが発生した場合は元に戻す
                setFlags(prev => ({ ...prev, [feature]: !newValue }));
                alert("更新に失敗しました");
            }
        });
    };

    const features = [
        {
            id: "show_attendance",
            name: "勤怠",
            description: "シフトと出勤ステータスを一覧で確認・管理できます。",
            icon: "AT",
            iconBg: "bg-emerald-100 dark:bg-emerald-900",
            iconText: "text-emerald-600 dark:text-emerald-400",
            category: "マネジメント向け",
        },
        {
            id: "show_timecard",
            name: "タイムカード",
            description: "出勤・退勤の打刻と勤務履歴の確認に使う基本機能です。",
            icon: "TC",
            iconBg: "bg-sky-100 dark:bg-sky-900",
            iconText: "text-sky-600 dark:text-sky-400",
            category: "キャスト/スタッフ共通",
        },
        {
            id: "show_users",
            name: "プロフィール情報",
            description: "キャスト・スタッフ・ゲストのアカウントを一元管理します。",
            icon: "US",
            iconBg: "bg-amber-100 dark:bg-amber-900",
            iconText: "text-amber-600 dark:text-amber-400",
            category: "管理者向け",
        },
        {
            id: "show_roles",
            name: "権限管理",
            description: "ロールごとの権限を細かく設定し、店舗の運用ルールをコントロールします。",
            icon: "RL",
            iconBg: "bg-fuchsia-100 dark:bg-fuchsia-900",
            iconText: "text-fuchsia-600 dark:text-fuchsia-400",
            category: "高度な設定",
        },
        {
            id: "show_menus",
            name: "メニュー",
            description: "お店のメニューを登録・管理し、金額やカテゴリを設定できます。",
            icon: "MN",
            iconBg: "bg-orange-100 dark:bg-orange-900",
            iconText: "text-orange-600 dark:text-orange-400",
            category: "店舗運営",
        },
    ];

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-10">
            <div className="max-w-3xl mx-auto pt-6 px-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">表示ページ</h1>
                        <p className="mt-1 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                            サイドバーに表示するページを設定します。有効にしたページのみがサイドバーに表示されます。
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {features.map((feature) => {
                        const isEnabled = flags[feature.id as keyof FeatureFlags];
                        return (
                            <div key={feature.id} className="relative">
                                <div
                                    className={`w-full flex flex-col rounded-2xl border p-4 shadow-sm transition-all ${isEnabled
                                        ? "border-blue-500 bg-blue-50/80 dark:bg-blue-900/20"
                                        : "border-slate-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80"
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${feature.iconBg} ${feature.iconText} text-sm font-semibold`}>
                                            {feature.icon}
                                        </div>
                                        <div className="space-y-1 flex-1">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{feature.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-gray-400">{feature.description}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between">
                                        <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">{feature.category}</p>
                                        <button
                                            type="button"
                                            onClick={() => handleToggle(feature.id as keyof FeatureFlags)}
                                            disabled={isPending}
                                            className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide transition-colors ${isEnabled
                                                ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                                                : "border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-600"
                                                } ${isPending ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                                        >
                                            {isEnabled ? (
                                                <span>表示中</span>
                                            ) : (
                                                <span>非表示</span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
