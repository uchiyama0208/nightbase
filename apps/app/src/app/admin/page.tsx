"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabaseClient";
import {
    Users,
    Store,
    Calendar,
    Clock,
    Database,
    ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TABLE_LABELS } from "./components/admin-sidebar";

interface TableCount {
    name: string;
    count: number;
}

const TABLE_CATEGORIES = [
    {
        title: "ユーザー関連",
        icon: Users,
        tables: ["users", "profiles", "profile_relationships", "past_employments"],
        color: "bg-blue-500",
    },
    {
        title: "店舗関連",
        icon: Store,
        tables: ["stores", "store_roles", "store_posts", "store_manuals"],
        color: "bg-green-500",
    },
    {
        title: "シフト関連",
        icon: Calendar,
        tables: ["shift_requests", "shift_request_dates", "shift_submissions"],
        color: "bg-purple-500",
    },
    {
        title: "勤怠関連",
        icon: Clock,
        tables: ["time_cards", "attendance", "pickup_routes", "pickup_passengers"],
        color: "bg-orange-500",
    },
];

export default function AdminDashboardPage() {
    const [tableCounts, setTableCounts] = useState<TableCount[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createBrowserClient() as any;

    useEffect(() => {
        async function fetchCounts() {
            setLoading(true);
            const counts: TableCount[] = [];

            const tables = [
                "users", "profiles", "stores", "time_cards", "attendance",
                "shift_requests", "menus", "orders", "table_sessions"
            ];

            for (const table of tables) {
                try {
                    const { count, error } = await supabase
                        .from(table)
                        .select("*", { count: "exact", head: true });

                    if (!error) {
                        counts.push({ name: table, count: count || 0 });
                    }
                } catch {
                    counts.push({ name: table, count: 0 });
                }
            }

            setTableCounts(counts);
            setLoading(false);
        }

        fetchCounts();
    }, []);

    const getCount = (table: string) => {
        return tableCounts.find((t) => t.name === table)?.count ?? 0;
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    管理者ダッシュボード
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    データベースの全テーブルを閲覧・編集できます
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            ユーザー数
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {loading ? "..." : getCount("users")}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            プロフィール数
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {loading ? "..." : getCount("profiles")}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            店舗数
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {loading ? "..." : getCount("stores")}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            タイムカード数
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {loading ? "..." : getCount("time_cards")}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Category Cards */}
            <div className="grid md:grid-cols-2 gap-4">
                {TABLE_CATEGORIES.map((category) => (
                    <Card
                        key={category.title}
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    >
                        <CardHeader className="flex flex-row items-center gap-3">
                            <div className={`p-2 rounded-lg ${category.color}`}>
                                <category.icon className="h-5 w-5 text-white" />
                            </div>
                            <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                                {category.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {category.tables.map((table) => (
                                    <Link
                                        key={table}
                                        href={`/admin/tables/${table}`}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {TABLE_LABELS[table] || table}
                                        </span>
                                        <ArrowRight className="h-4 w-4 text-gray-400" />
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* All Tables Link */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                        <Database className="h-5 w-5" />
                        全テーブル一覧
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        左のサイドバーから各テーブルにアクセスできます。全42テーブルの閲覧・編集が可能です。
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export const dynamic = 'force-dynamic';
