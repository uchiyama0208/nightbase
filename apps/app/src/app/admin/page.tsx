"use client";

import { useState, useEffect } from "react";
import {
    Users,
    Eye,
    MousePointerClick,
    TrendingUp,
    TrendingDown,
    Search,
    Globe,
    Monitor,
    Smartphone,
    Tablet,
    Loader2,
    Clock,
    Target,
    ArrowUp,
    BarChart3,
    Activity,
    Percent,
    Hash,
    DollarSign,
    Cpu,
    Zap,
    MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    LineChart,
    Line,
    Legend,
    AreaChart,
    Area,
} from "recharts";

interface AnalyticsData {
    overview: {
        activeUsers: number;
        sessions: number;
        pageViews: number;
        avgSessionDuration: number;
        bounceRate: number;
    };
    trafficSources: { source: string; sessions: number }[];
    topPages: { path: string; views: number }[];
    devices: { device: string; sessions: number }[];
    period: string;
}

interface SearchConsoleData {
    overview: {
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
    };
    queries: {
        query: string;
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
    }[];
    pages: {
        page: string;
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
    }[];
    period: string;
}

interface OpenAIUsageData {
    overview: {
        totalCost: number;
        currency: string;
        totalInputTokens: number;
        totalOutputTokens: number;
        totalTokens: number;
        totalRequests: number;
    };
    dailyCosts: { date: string; cost: number }[];
    modelBreakdown: {
        model: string;
        inputTokens: number;
        outputTokens: number;
        requests: number;
        totalTokens: number;
    }[];
    period: string;
}

const PERIODS = [
    { value: "today", label: "今日" },
    { value: "7days", label: "7日間" },
    { value: "30days", label: "30日間" },
    { value: "90days", label: "90日間" },
];

const DEVICE_COLORS = ["#3b82f6", "#10b981", "#f59e0b"];
const TRAFFIC_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"];

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getDeviceLabel(device: string) {
    switch (device.toLowerCase()) {
        case "desktop":
            return "PC";
        case "mobile":
            return "モバイル";
        case "tablet":
            return "タブレット";
        default:
            return device;
    }
}

function StatCard({
    icon: Icon,
    label,
    value,
    subValue,
    gradient,
}: {
    icon: any;
    label: string;
    value: string | number;
    subValue?: string;
    gradient: string;
}) {
    return (
        <div className={`rounded-2xl ${gradient} p-4 text-white relative overflow-hidden`}>
            <div className="absolute right-0 top-0 opacity-10">
                <Icon className="h-24 w-24 -mr-6 -mt-6" />
            </div>
            <div className="relative">
                <Icon className="h-5 w-5 opacity-80 mb-2" />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs opacity-80 mt-0.5">{label}</p>
                {subValue && (
                    <p className="text-xs opacity-60 mt-1">{subValue}</p>
                )}
            </div>
        </div>
    );
}

export default function AdminDashboardPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [searchConsoleData, setSearchConsoleData] = useState<SearchConsoleData | null>(null);
    const [openaiData, setOpenaiData] = useState<OpenAIUsageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState("7days");

    useEffect(() => {
        loadAnalytics();
    }, [period]);

    const loadAnalytics = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [gaRes, scRes, openaiRes] = await Promise.all([
                fetch(`/api/admin/analytics?period=${period}`),
                fetch(`/api/admin/analytics/search-console?period=${period}`),
                fetch(`/api/admin/openai-usage?period=${period}`),
            ]);

            if (!gaRes.ok) {
                const err = await gaRes.json();
                throw new Error(err.error || "Failed to fetch analytics");
            }
            const gaResult = await gaRes.json();
            setData(gaResult);

            if (scRes.ok) {
                const scResult = await scRes.json();
                setSearchConsoleData(scResult);
            } else {
                setSearchConsoleData(null);
            }

            if (openaiRes.ok) {
                const openaiResult = await openaiRes.json();
                setOpenaiData(openaiResult);
            } else {
                setOpenaiData(null);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">読み込み中...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    ダッシュボード
                </h1>
                <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                    <Button
                        onClick={loadAnalytics}
                        className="mt-4 rounded-lg"
                        variant="outline"
                    >
                        再試行
                    </Button>
                </div>
            </div>
        );
    }

    const totalDeviceSessions = data?.devices.reduce((sum, d) => sum + d.sessions, 0) || 1;

    // Prepare pie chart data for devices
    const deviceChartData = data?.devices.map((d, i) => ({
        name: getDeviceLabel(d.device),
        value: d.sessions,
        color: DEVICE_COLORS[i % DEVICE_COLORS.length],
        percent: Math.round((d.sessions / totalDeviceSessions) * 100),
    })) || [];

    // Prepare bar chart data for traffic sources
    const trafficChartData = data?.trafficSources.slice(0, 6).map((s, i) => ({
        name: s.source === "(direct)" ? "直接" : s.source.length > 12 ? s.source.substring(0, 12) + "..." : s.source,
        sessions: s.sessions,
        fill: TRAFFIC_COLORS[i % TRAFFIC_COLORS.length],
    })) || [];

    // Prepare bar chart data for top pages
    const pageChartData = data?.topPages.slice(0, 6).map((p) => ({
        name: p.path === "/" ? "トップ" : p.path.length > 15 ? p.path.substring(0, 15) + "..." : p.path,
        views: p.views,
    })) || [];

    // Search Console query chart data
    const queryChartData = searchConsoleData?.queries.slice(0, 6).map((q) => ({
        name: q.query.length > 12 ? q.query.substring(0, 12) + "..." : q.query,
        clicks: q.clicks,
        impressions: Math.round(q.impressions / 10), // Scale down for better visualization
    })) || [];

    // Calculate pages per session
    const pagesPerSession = data?.overview.sessions
        ? (data.overview.pageViews / data.overview.sessions).toFixed(1)
        : "0";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        ダッシュボード
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        サイトアナリティクス
                    </p>
                </div>
                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                    {PERIODS.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => setPeriod(p.value)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                                period === p.value
                                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Stats Row 1 - GA4 Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                    icon={Users}
                    label="ユーザー数"
                    value={data?.overview.activeUsers.toLocaleString() || 0}
                    gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                />
                <StatCard
                    icon={Activity}
                    label="セッション数"
                    value={data?.overview.sessions.toLocaleString() || 0}
                    gradient="bg-gradient-to-br from-cyan-500 to-cyan-600"
                />
                <StatCard
                    icon={Eye}
                    label="ページビュー"
                    value={data?.overview.pageViews.toLocaleString() || 0}
                    subValue={`${pagesPerSession} PV/セッション`}
                    gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
                />
                <StatCard
                    icon={Clock}
                    label="平均滞在時間"
                    value={formatDuration(data?.overview.avgSessionDuration || 0)}
                    gradient="bg-gradient-to-br from-teal-500 to-teal-600"
                />
            </div>

            {/* Main Stats Row 2 - Search Console + Bounce */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                    icon={MousePointerClick}
                    label="検索クリック"
                    value={searchConsoleData?.overview.clicks.toLocaleString() || 0}
                    gradient="bg-gradient-to-br from-violet-500 to-violet-600"
                />
                <StatCard
                    icon={Hash}
                    label="検索表示回数"
                    value={searchConsoleData?.overview.impressions.toLocaleString() || 0}
                    gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                />
                <StatCard
                    icon={Target}
                    label="検索CTR"
                    value={`${searchConsoleData?.overview.ctr.toFixed(1) || 0}%`}
                    gradient="bg-gradient-to-br from-fuchsia-500 to-fuchsia-600"
                />
                <StatCard
                    icon={ArrowUp}
                    label="平均検索順位"
                    value={`#${searchConsoleData?.overview.position.toFixed(1) || "-"}`}
                    gradient="bg-gradient-to-br from-amber-500 to-orange-500"
                />
            </div>

            {/* Charts Row 1 */}
            <div className="grid lg:grid-cols-3 gap-4">
                {/* Traffic Sources */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Globe className="h-4 w-4 text-gray-500" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            流入元
                        </h3>
                    </div>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trafficChartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="#9ca3af" width={70} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        color: '#fff',
                                    }}
                                />
                                <Bar dataKey="sessions" radius={[0, 4, 4, 0]}>
                                    {trafficChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Device Breakdown */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Monitor className="h-4 w-4 text-gray-500" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            デバイス
                        </h3>
                    </div>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={deviceChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={35}
                                    outerRadius={60}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {deviceChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        color: '#fff',
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                        {deviceChartData.map((d, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                                <div
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: d.color }}
                                />
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                    {d.name} ({d.percent}%)
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Pages */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="h-4 w-4 text-gray-500" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            人気ページ
                        </h3>
                    </div>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={pageChartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="#9ca3af" width={70} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        color: '#fff',
                                    }}
                                />
                                <Bar dataKey="views" fill="#10b981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Search Console Section */}
            {searchConsoleData && (
                <div className="grid lg:grid-cols-2 gap-4">
                    {/* Search Queries with Chart */}
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-gray-500" />
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                    検索クエリ パフォーマンス
                                </h3>
                            </div>
                        </div>
                        <div className="h-48 mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={queryChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                    <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#9ca3af" />
                                    <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1f2937',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            color: '#fff',
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Bar dataKey="clicks" fill="#8b5cf6" name="クリック" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="impressions" fill="#06b6d4" name="表示(÷10)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Search Queries List */}
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-gray-500" />
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                    検索キーワード TOP10
                                </h3>
                            </div>
                        </div>
                        <div className="space-y-2 max-h-[220px] overflow-y-auto">
                            {searchConsoleData.queries.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                                    データがありません
                                </p>
                            ) : (
                                searchConsoleData.queries.slice(0, 10).map((query, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="text-xs font-medium text-gray-400 w-5">{i + 1}</span>
                                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                                {query.query}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                                {query.clicks}
                                            </span>
                                            <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
                                                #{query.position.toFixed(0)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Additional Stats */}
            <div className="grid md:grid-cols-3 gap-4">
                {/* Bounce Rate Card */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Percent className="h-4 w-4 text-gray-500" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            直帰率
                        </h3>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                            {(data?.overview.bounceRate || 0).toFixed(1)}
                        </span>
                        <span className="text-xl text-gray-500 mb-1">%</span>
                    </div>
                    <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-green-500 to-yellow-500 rounded-full transition-all"
                            style={{ width: `${Math.min(data?.overview.bounceRate || 0, 100)}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {(data?.overview.bounceRate || 0) < 40 ? "良好" : (data?.overview.bounceRate || 0) < 60 ? "普通" : "改善が必要"}
                    </p>
                </div>

                {/* Engagement Summary */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Activity className="h-4 w-4 text-gray-500" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            エンゲージメント
                        </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {pagesPerSession}
                            </p>
                            <p className="text-xs text-gray-500">PV/セッション</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {formatDuration(data?.overview.avgSessionDuration || 0)}
                            </p>
                            <p className="text-xs text-gray-500">平均滞在</p>
                        </div>
                    </div>
                </div>

                {/* Search Performance Summary */}
                {searchConsoleData && (
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Search className="h-4 w-4 text-gray-500" />
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                検索サマリー
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                                <p className="text-lg font-bold text-gray-900 dark:text-white">
                                    {searchConsoleData.queries.length}
                                </p>
                                <p className="text-xs text-gray-500">検索キーワード</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                                <p className="text-lg font-bold text-gray-900 dark:text-white">
                                    {searchConsoleData.pages.length}
                                </p>
                                <p className="text-xs text-gray-500">検索表示ページ</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Search Console Pages */}
            {searchConsoleData && searchConsoleData.pages.length > 0 && (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="h-4 w-4 text-gray-500" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            検索で表示されたページ
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">ページ</th>
                                    <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">クリック</th>
                                    <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">表示回数</th>
                                    <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">CTR</th>
                                    <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">順位</th>
                                </tr>
                            </thead>
                            <tbody>
                                {searchConsoleData.pages.slice(0, 8).map((page, i) => (
                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="py-2 px-2 text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                                            {page.page || "/"}
                                        </td>
                                        <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">
                                            {page.clicks.toLocaleString()}
                                        </td>
                                        <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">
                                            {page.impressions.toLocaleString()}
                                        </td>
                                        <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">
                                            {page.ctr.toFixed(1)}%
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <span className="text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 rounded">
                                                #{page.position.toFixed(1)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* OpenAI Usage Section */}
            {openaiData && (
                <>
                    {/* OpenAI Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard
                            icon={DollarSign}
                            label="OpenAI 費用"
                            value={`$${openaiData.overview.totalCost.toFixed(2)}`}
                            gradient="bg-gradient-to-br from-rose-500 to-rose-600"
                        />
                        <StatCard
                            icon={MessageSquare}
                            label="API リクエスト数"
                            value={openaiData.overview.totalRequests.toLocaleString()}
                            gradient="bg-gradient-to-br from-pink-500 to-pink-600"
                        />
                        <StatCard
                            icon={Zap}
                            label="入力トークン"
                            value={formatTokens(openaiData.overview.totalInputTokens)}
                            gradient="bg-gradient-to-br from-indigo-500 to-indigo-600"
                        />
                        <StatCard
                            icon={Cpu}
                            label="出力トークン"
                            value={formatTokens(openaiData.overview.totalOutputTokens)}
                            gradient="bg-gradient-to-br from-sky-500 to-sky-600"
                        />
                    </div>

                    {/* OpenAI Charts Row */}
                    <div className="grid lg:grid-cols-2 gap-4">
                        {/* Daily Cost Chart */}
                        {openaiData.dailyCosts.length > 0 && (
                            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <DollarSign className="h-4 w-4 text-gray-500" />
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                        OpenAI 日別費用
                                    </h3>
                                </div>
                                <div className="h-52">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={openaiData.dailyCosts}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                            <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" tickFormatter={(v) => `$${v}`} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#1f2937',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    color: '#fff',
                                                }}
                                                formatter={(value) => [`$${Number(value ?? 0).toFixed(4)}`, '費用']}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="cost"
                                                stroke="#f43f5e"
                                                fill="url(#colorCost)"
                                                strokeWidth={2}
                                            />
                                            <defs>
                                                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Model Breakdown */}
                        {openaiData.modelBreakdown.length > 0 && (
                            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Cpu className="h-4 w-4 text-gray-500" />
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                        モデル別使用量
                                    </h3>
                                </div>
                                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                                    {openaiData.modelBreakdown.slice(0, 10).map((model, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate block">
                                                    {model.model}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {model.requests.toLocaleString()} リクエスト
                                                </span>
                                            </div>
                                            <div className="text-right ml-3">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {formatTokens(model.totalTokens)}
                                                </span>
                                                <div className="text-xs text-gray-500">
                                                    <span className="text-indigo-500">{formatTokens(model.inputTokens)}</span>
                                                    {" / "}
                                                    <span className="text-sky-500">{formatTokens(model.outputTokens)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) {
        return `${(tokens / 1_000_000).toFixed(1)}M`;
    } else if (tokens >= 1_000) {
        return `${(tokens / 1_000).toFixed(1)}K`;
    }
    return tokens.toString();
}

export const dynamic = 'force-dynamic';
