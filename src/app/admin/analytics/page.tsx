"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatDateTime } from "@/lib/utils";

const TABLE_CONFIG = [
  { key: "blog", table: "blog_posts", label: "ブログ" },
  { key: "case", table: "case_studies", label: "導入事例" },
  { key: "manual", table: "manuals", label: "マニュアル" },
] as const;

type TableKey = (typeof TABLE_CONFIG)[number]["key"];

type ContentRecord = {
  id: string;
  title: string;
  status: string;
  published_at: string | null;
  updated_at: string | null;
  type: TableKey;
};

type AnalyticsState = {
  loading: boolean;
  error: string | null;
  records: ContentRecord[];
};

function StatCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
      <p className="mt-3 text-4xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </div>
  );
}

type TimelinePoint = { label: string; count: number };

type BreakdownPoint = { label: string; count: number };

type AnalyticsContentProps = { supabase: any };

function AnalyticsContent({ supabase }: AnalyticsContentProps) {
  const [state, setState] = useState<AnalyticsState>({ loading: true, error: null, records: [] });

  const loadAnalytics = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const results = await Promise.all(
        TABLE_CONFIG.map(async (config) => {
          const { data, error } = await supabase
            .from(config.table)
            .select("id, title, status, published_at, updated_at");

          if (error) {
            throw new Error(`${config.label}の取得に失敗しました: ${error.message}`);
          }

          const rows = (data ?? []) as any[];
          return rows.map((row) => ({
            id: row.id,
            title: row.title ?? `${config.label} ${row.id}`,
            status: row.status ?? "draft",
            published_at: row.published_at ?? null,
            updated_at: row.updated_at ?? row.published_at ?? null,
            type: config.key,
          } satisfies ContentRecord));
        })
      );

      setState({ loading: false, error: null, records: results.flat() });
    } catch (error) {
      console.error("[AdminAnalytics] データ取得エラー", error);
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "分析データの取得に失敗しました。",
        records: [],
      });
    }
  }, [supabase]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const metrics = useMemo(() => {
    const now = new Date();
    const last30Threshold = new Date(now);
    last30Threshold.setDate(now.getDate() - 30);

    const publishedRecords = state.records.filter((record) => record.status === "published");
    const publishedTotal = publishedRecords.length;
    const publishedLast30 = publishedRecords.filter((record) => {
      if (!record.published_at) return false;
      const publishedAt = new Date(record.published_at);
      return publishedAt >= last30Threshold;
    }).length;
    const draftCount = state.records.filter((record) => record.status !== "published").length;

    const lastUpdatedDate = state.records.reduce<Date | null>((latest, record) => {
      const raw = record.updated_at ?? record.published_at;
      if (!raw) return latest;
      const candidate = new Date(raw);
      if (!latest || candidate > latest) {
        return candidate;
      }
      return latest;
    }, null);

    const timelineData = buildTimelineData(publishedRecords);
    const breakdown = TABLE_CONFIG.map((config) => ({
      label: config.label,
      count: publishedRecords.filter((record) => record.type === config.key).length,
    }));

    const recent = [...state.records]
      .filter((record) => record.updated_at || record.published_at)
      .sort((a, b) => {
        const aDate = new Date(a.updated_at ?? a.published_at ?? 0).getTime();
        const bDate = new Date(b.updated_at ?? b.published_at ?? 0).getTime();
        return bDate - aDate;
      })
      .slice(0, 10);

    return {
      publishedTotal,
      publishedLast30,
      draftCount,
      lastUpdatedLabel: lastUpdatedDate ? formatDateTime(lastUpdatedDate.toISOString()) : "更新履歴なし",
      timelineData,
      breakdown,
      recent,
    };
  }, [state.records]);

  if (state.loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
        分析データを読み込んでいます…
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="space-y-4 rounded-3xl border border-red-500/40 bg-red-500/10 p-8 text-center text-red-100">
        <p>{state.error}</p>
        <Button variant="outline" className="border-white/20 text-white" onClick={loadAnalytics}>
          再読み込み
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">分析</p>
        <h1 className="text-4xl font-semibold text-white">分析ダッシュボード</h1>
        <p className="text-sm text-slate-400">
          ブログ・導入事例・マニュアルの公開状況や更新状況を一目で確認できます。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="総公開コンテンツ" value={`${metrics.publishedTotal}`} description="現在公開中の合計件数" />
        <StatCard title="直近30日" value={`${metrics.publishedLast30}`} description="直近30日間で公開された件数" />
        <StatCard title="下書き" value={`${metrics.draftCount}`} description="公開待ちのコンテンツ" />
        <StatCard title="最終更新" value={metrics.lastUpdatedLabel} description="3種別の最新更新日時" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          <header>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">推移</p>
            <h2 className="text-xl font-semibold text-white">公開コンテンツの推移 (週次)</h2>
          </header>
          <TimelineChart data={metrics.timelineData} />
        </section>
        <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          <header>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">内訳</p>
            <h2 className="text-xl font-semibold text-white">コンテンツ種別ごとの公開数</h2>
          </header>
          <BreakdownChart data={metrics.breakdown} />
        </section>
      </div>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">最近の更新</p>
            <h2 className="text-xl font-semibold text-white">最近更新されたコンテンツ</h2>
          </div>
          <Button variant="outline" className="border-white/20 text-white" onClick={loadAnalytics}>
            最新の情報に更新
          </Button>
        </header>
        <RecentUpdatesTable items={metrics.recent} />
      </section>
    </div>
  );
}

function buildTimelineData(records: ContentRecord[]): TimelinePoint[] {
  const bucketCount = 12;
  const bucketSpanDays = 7;
  const dayMs = 24 * 60 * 60 * 1000;
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - bucketCount * bucketSpanDays + 1);

  const buckets: TimelinePoint[] = Array.from({ length: bucketCount }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index * bucketSpanDays);
    const label = `${date.getMonth() + 1}/${date.getDate()}`;
    return { label, count: 0 };
  });

  records.forEach((record) => {
    if (!record.published_at) return;
    const publishedAt = new Date(record.published_at);
    if (publishedAt < startDate) return;

    const diff = publishedAt.getTime() - startDate.getTime();
    const bucketIndex = Math.min(
      buckets.length - 1,
      Math.max(0, Math.floor(diff / (bucketSpanDays * dayMs)))
    );
    buckets[bucketIndex].count += 1;
  });

  return buckets;
}

function TimelineChart({ data }: { data: TimelinePoint[] }) {
  const maxCount = Math.max(...data.map((point) => point.count), 1);

  return (
    <div className="flex h-48 items-end gap-2">
      {data.map((point) => (
        <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="w-full rounded-t-2xl bg-primary/60" style={{ height: `${(point.count / maxCount) * 100}%` }} />
          <span className="text-[11px] text-slate-400">{point.label}</span>
          <span className="text-xs font-semibold text-white">{point.count}</span>
        </div>
      ))}
    </div>
  );
}

function BreakdownChart({ data }: { data: BreakdownPoint[] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0) || 1;
  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>{item.label}</span>
            <span className="font-semibold text-white">{item.count}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-secondary"
              style={{ width: `${(item.count / total) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentUpdatesTable({ items }: { items: ContentRecord[] }) {
  const typeLabelMap: Record<TableKey, string> = {
    blog: "ブログ",
    case: "導入事例",
    manual: "マニュアル",
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 bg-slate-900/70 text-xs uppercase tracking-[0.25em] text-slate-400">
            <TableHead className="px-6">種別</TableHead>
            <TableHead>タイトル</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>公開日</TableHead>
            <TableHead className="text-right">最終更新</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-400">
                最近の更新履歴がありません。
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={`${item.type}-${item.id}`} className="border-white/5">
                <TableCell className="px-6 text-sm text-slate-300">{typeLabelMap[item.type]}</TableCell>
                <TableCell className="text-sm text-white">{item.title}</TableCell>
                <TableCell>
                  <Badge
                    variant={item.status === "published" ? "success" : "neutral"}
                    className={cn(
                      "px-3 py-1 text-xs",
                      item.status === "published" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-300"
                    )}
                  >
                    {item.status === "published" ? "公開" : "下書き"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-300">{formatDateTime(item.published_at)}</TableCell>
                <TableCell className="text-right text-sm text-slate-300">{formatDateTime(item.updated_at)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <AdminProtected>
      {({ supabase }) => <AnalyticsContent supabase={supabase} />}
    </AdminProtected>
  );
}
