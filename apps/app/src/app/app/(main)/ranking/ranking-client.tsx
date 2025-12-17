"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Trophy, Crown, Medal, Award } from "lucide-react";

interface RankingEntry {
    rank: number;
    profileId: string;
    name: string;
    avatarUrl: string | null;
    status: string | null;
    totalSales: number;
    orderCount: number;
    shimeiCount: number;
    douhanCount: number;
    sessionCount: number;
}

interface RankingData {
    rankings: RankingEntry[];
    period: string;
}

type Period = "today" | "week" | "month" | "year";

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0,
    }).format(amount);
}

function getRankIcon(rank: number) {
    switch (rank) {
        case 1:
            return <Crown className="h-6 w-6 text-yellow-500" />;
        case 2:
            return <Medal className="h-5 w-5 text-gray-400" />;
        case 3:
            return <Award className="h-5 w-5 text-amber-600" />;
        default:
            return null;
    }
}

function getRankBgClass(rank: number) {
    switch (rank) {
        case 1:
            return "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-700";
        case 2:
            return "bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 border-gray-300 dark:border-gray-600";
        case 3:
            return "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-700";
        default:
            return "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700";
    }
}

interface RankingClientProps {
    canEdit?: boolean;
}

export function RankingClient({ canEdit = false }: RankingClientProps) {
    const [data, setData] = useState<RankingData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<Period>("today");

    // Vercel-style tabs with animated underline
    const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    const periodLabels: Record<Period, string> = {
        today: "今日",
        week: "週間",
        month: "月間",
        year: "年間",
    };

    const periods: Period[] = ["today", "week", "month", "year"];

    useEffect(() => {
        const activeButton = tabsRef.current[period];
        if (activeButton) {
            setIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
            });
        }
    }, [period]);

    useEffect(() => {
        loadRankingData();
    }, [period]);

    const loadRankingData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/ranking?period=${period}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "ランキングデータの取得に失敗しました");
            }
            const result = await res.json();
            setData(result);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "エラーが発生しました";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (error) {
        return (
            <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <button
                    onClick={loadRankingData}
                    className="mt-4 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                    再試行
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Vercel-style Tab Navigation */}
            <div className="relative">
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    {periods.map((p) => (
                        <button
                            key={p}
                            ref={(el) => { tabsRef.current[p] = el; }}
                            type="button"
                            onClick={() => setPeriod(p)}
                            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                                period === p
                                    ? "text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            }`}
                        >
                            {periodLabels[p]}
                        </button>
                    ))}
                </div>
                <span
                    className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-300 ease-out"
                    style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                />
            </div>

            {/* Rankings */}
            {isLoading ? (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">読み込み中...</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {data?.rankings.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>データがありません</p>
                        </div>
                    ) : (
                        data?.rankings.map((entry) => (
                            <div
                                key={entry.profileId}
                                className={`rounded-2xl border p-4 transition-all ${getRankBgClass(entry.rank)}`}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Rank */}
                                    <div className="flex-shrink-0 w-12 text-center">
                                        {getRankIcon(entry.rank) || (
                                            <span className="text-lg font-bold text-gray-400 dark:text-gray-500">
                                                {entry.rank}
                                            </span>
                                        )}
                                    </div>

                                    {/* Avatar */}
                                    <div className="flex-shrink-0">
                                        {entry.avatarUrl ? (
                                            <img
                                                src={entry.avatarUrl}
                                                alt={entry.name}
                                                className="h-12 w-12 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm"
                                            />
                                        ) : (
                                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                                {entry.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Name & Stats */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1">
                                            {entry.name}
                                            {entry.status === "体入" && (
                                                <span className="text-[9px] px-1 py-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 flex-shrink-0">
                                                    体入
                                                </span>
                                            )}
                                        </h3>
                                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            <span>接客 {entry.sessionCount}回</span>
                                            <span>指名 {entry.shimeiCount}回</span>
                                            <span>同伴 {entry.douhanCount}回</span>
                                        </div>
                                    </div>

                                    {/* Sales Amount */}
                                    <div className="flex-shrink-0 text-right">
                                        <div className={`text-lg font-bold ${
                                            entry.rank === 1
                                                ? "text-yellow-600 dark:text-yellow-400"
                                                : entry.rank <= 3
                                                ? "text-gray-700 dark:text-gray-200"
                                                : "text-gray-600 dark:text-gray-300"
                                        }`}>
                                            {formatCurrency(entry.totalSales)}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {entry.orderCount}品
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export const dynamic = 'force-dynamic';
