"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatDateTime } from "@/lib/utils";

const TABLE_CONFIG = [
  { key: "blog", type: "blog" as const, label: "ブログ" },
  {
    key: "case",
    type: "case_study" as const,
    label: "導入事例",
    isCaseStudy: true,
  },
  { key: "manual", type: "manual" as const, label: "マニュアル" },
] as const;

type TableKey = (typeof TABLE_CONFIG)[number]["key"];

type ContentRecord = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  updated_at: string | null;
  type: TableKey;
  body: string | null;
};

type SeoRecord = ContentRecord & {
  typeLabel: string;
  titleLength: number;
  titleIssues: string[];
  slugIssues: string[];
  internalLinkCount: number;
  internalLinks: string[];
  keywords: KeywordStat[];
  seoStatus: "ok" | "needs_attention";
  advice: string[];
  summaryText: string;
};

type KeywordStat = { word: string; count: number };

type AnalyticsState = {
  loading: boolean;
  error: string | null;
  records: ContentRecord[];
};

const TYPE_LABEL_MAP: Record<TableKey, string> = {
  blog: "ブログ",
  case: "導入事例",
  manual: "マニュアル",
};

const SEO_TYPE_OPTIONS: Array<{ value: "all" | TableKey; label: string }> = [
  { value: "all", label: "すべて" },
  { value: "blog", label: "ブログ" },
  { value: "case", label: "導入事例" },
  { value: "manual", label: "マニュアル" },
];

const SEO_STATUS_OPTIONS: Array<{ value: "all" | "ok" | "needs_attention"; label: string }> = [
  { value: "all", label: "すべて" },
  { value: "ok", label: "OK" },
  { value: "needs_attention", label: "要改善" },
];

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
  const [seoTypeFilter, setSeoTypeFilter] = useState<"all" | TableKey>("all");
  const [seoStatusFilter, setSeoStatusFilter] = useState<"all" | "ok" | "needs_attention">("all");
  const [seoSearch, setSeoSearch] = useState("");
  const [selectedSeoRecord, setSelectedSeoRecord] = useState<SeoRecord | null>(null);

  const loadAnalytics = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const results = await Promise.all(
        TABLE_CONFIG.map(async (config) => {
          const { data, error } = await supabase
            .from("cms_entries")
            .select("id, type, title, status, published_at, slug, body")
            .eq("type", config.type);

          if (error) {
            throw new Error(`${config.label}の取得に失敗しました: ${error.message}`);
          }

          const rows = (data ?? []) as any[];
          return rows.map((row) => {
            const slugValue = typeof row?.slug === "string" ? row.slug : "";
            const contentValue: string | null = typeof row?.body === "string" ? row.body : null;

            return {
              id: row.id,
              title: row.title ?? `${config.label} ${row.id}`,
              slug: slugValue,
              status: row.status ?? "draft",
              published_at: row.published_at ?? null,
              updated_at: row.published_at ?? null,
              type: config.key,
              body: contentValue && contentValue.length > 0 ? contentValue : null,
            } satisfies ContentRecord;
          });
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

  const seoRecords = useMemo(() => analyzeSeoRecords(state.records), [state.records]);

  const filteredSeoRecords = useMemo(() => {
    const normalizedSearch = seoSearch.trim().toLowerCase();
    return seoRecords.filter((record) => {
      const matchesType = seoTypeFilter === "all" ? true : record.type === seoTypeFilter;
      const matchesStatus = seoStatusFilter === "all" ? true : record.seoStatus === seoStatusFilter;
      const matchesSearch = normalizedSearch
        ? record.title.toLowerCase().includes(normalizedSearch) || record.slug.toLowerCase().includes(normalizedSearch)
        : true;
      return matchesType && matchesStatus && matchesSearch;
    });
  }, [seoRecords, seoSearch, seoStatusFilter, seoTypeFilter]);

  const seoSummary = useMemo(() => {
    const needsAttention = seoRecords.filter((record) => record.seoStatus === "needs_attention");
    return {
      total: seoRecords.length,
      needsAttention: needsAttention.length,
      titleIssues: seoRecords.filter((record) => record.titleIssues.length > 0).length,
      slugIssues: seoRecords.filter((record) => record.slugIssues.length > 0).length,
    };
  }, [seoRecords]);

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

      <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">SEO</p>
          <h2 className="text-xl font-semibold text-white">SEOヘルス概要</h2>
          <p className="text-sm text-slate-400">
            タイトルやスラッグ、内部リンクの状態を確認し、改善が必要なページを把握できます。
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="チェック対象ページ" value={`${seoSummary.total}`} description="公開中のコンテンツ総数" />
          <StatCard title="要改善" value={`${seoSummary.needsAttention}`} description="SEO改善が必要なページ数" />
          <StatCard title="タイトル要調整" value={`${seoSummary.titleIssues}`} description="推奨文字数から外れているページ" />
          <StatCard title="スラッグ要確認" value={`${seoSummary.slugIssues}`} description="スラッグに問題があるページ" />
        </div>
      </section>

      <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">SEOチェック</p>
          <h2 className="text-xl font-semibold text-white">SEOチェック一覧</h2>
          <p className="text-sm text-slate-400">
            種別やステータスで絞り込み、改善ポイントや内部リンク状況を確認できます。
          </p>
        </header>
        <div className="space-y-4">
          <Input
            value={seoSearch}
            onChange={(event) => setSeoSearch((event.target as HTMLInputElement).value)}
            placeholder="タイトルやスラッグで検索"
            className="bg-slate-900/60 text-white"
          />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {SEO_TYPE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={seoTypeFilter === option.value ? "default" : "outline"}
                  className={cn(
                    "text-sm",
                    seoTypeFilter === option.value
                      ? "bg-primary text-white"
                      : "border-white/20 text-slate-200 hover:bg-white/10 hover:text-white"
                  )}
                  onClick={() => setSeoTypeFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {SEO_STATUS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={seoStatusFilter === option.value ? "default" : "outline"}
                  className={cn(
                    "text-sm",
                    seoStatusFilter === option.value
                      ? "bg-secondary text-slate-900"
                      : "border-white/20 text-slate-200 hover:bg-white/10 hover:text-white"
                  )}
                  onClick={() => setSeoStatusFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <SeoCheckTable records={filteredSeoRecords} onSelect={setSelectedSeoRecord} />
        <SeoDetailPanel record={selectedSeoRecord} onClose={() => setSelectedSeoRecord(null)} />
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
    const bucket = buckets[bucketIndex];
    if (bucket) {
      bucket.count += 1;
    }
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
                <TableCell className="px-6 text-sm text-slate-300">{TYPE_LABEL_MAP[item.type]}</TableCell>
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

function SeoCheckTable({ records, onSelect }: { records: SeoRecord[]; onSelect: (record: SeoRecord) => void }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-white/10 bg-slate-900/50">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 bg-slate-900/70 text-xs uppercase tracking-[0.2em] text-slate-400">
            <TableHead className="px-6">種別</TableHead>
            <TableHead>タイトル</TableHead>
            <TableHead>スラッグ</TableHead>
            <TableHead>公開日</TableHead>
            <TableHead>タイトル文字数</TableHead>
            <TableHead>スラッグ品質</TableHead>
            <TableHead>内部リンク</TableHead>
            <TableHead>SEOステータス</TableHead>
            <TableHead className="text-right">改善ポイント</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="py-10 text-center text-sm text-slate-400">
                条件に一致するページはありません。
              </TableCell>
            </TableRow>
          ) : (
            records.map((record) => {
              const slugOk = record.slugIssues.length === 0;
              return (
                <TableRow
                  key={`${record.type}-${record.id}`}
                  className="cursor-pointer border-white/5 hover:bg-white/5"
                  onClick={() => onSelect(record)}
                >
                  <TableCell className="px-6 text-sm text-slate-300">{record.typeLabel}</TableCell>
                  <TableCell className="text-sm text-white">{record.title}</TableCell>
                  <TableCell className="text-xs text-slate-400">{record.slug || "-"}</TableCell>
                  <TableCell className="text-sm text-slate-300">{formatDateTime(record.published_at)}</TableCell>
                  <TableCell className="text-sm text-slate-300">{record.titleLength}文字</TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "px-3 py-1 text-xs",
                        slugOk ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/20 text-amber-100"
                      )}
                    >
                      {slugOk ? "良好" : "要確認"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-300">{record.internalLinkCount}</TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "px-3 py-1 text-xs",
                        record.seoStatus === "ok"
                          ? "bg-emerald-500/20 text-emerald-200"
                          : "bg-rose-500/20 text-rose-100"
                      )}
                    >
                      {record.seoStatus === "ok" ? "OK" : "要改善"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-slate-300">
                    {record.advice.length > 0 ? record.advice[0] : "良好"}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function SeoDetailPanel({ record, onClose }: { record: SeoRecord | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(record)} onOpenChange={(open) => (!open ? onClose() : null)}>
      <SheetContent
        side="right"
        className="w-full border-l border-white/10 bg-slate-950 text-white sm:max-w-xl"
      >
        {record ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-2xl font-semibold text-white">{record.title}</SheetTitle>
              <SheetDescription className="text-sm text-slate-400">
                {record.typeLabel} / {record.slug || "スラッグ未設定"}
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="mt-6 h-[calc(100vh-10rem)] pr-4">
              <div className="space-y-6 pb-10">
                <div className="space-y-3 rounded-2xl bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">概要</p>
                  <dl className="space-y-2 text-sm text-slate-200">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-400">種別</dt>
                      <dd>{record.typeLabel}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-400">公開日</dt>
                      <dd>{formatDateTime(record.published_at)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-400">最終更新</dt>
                      <dd>{formatDateTime(record.updated_at)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="space-y-3 rounded-2xl bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">タイトル &amp; スラッグ</p>
                  <ul className="space-y-2 text-sm text-slate-200">
                    <li>タイトル文字数: {record.titleLength}文字</li>
                    <li>スラッグ: {record.slug || "未設定"}</li>
                  </ul>
                  <div className="rounded-2xl bg-slate-900/60 p-3 text-sm text-slate-300">
                    {record.titleIssues.length === 0 && record.slugIssues.length === 0
                      ? "タイトル・スラッグは良好です"
                      : (
                        <ul className="list-disc space-y-1 pl-5">
                          {[...record.titleIssues, ...record.slugIssues].map((issue) => (
                            <li key={issue}>{issue}</li>
                          ))}
                        </ul>
                      )}
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">改善ポイント</p>
                  {record.advice.length === 0 ? (
                    <p className="text-sm text-slate-300">現在のところ特別な改善は必要ありません。</p>
                  ) : (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
                      {record.advice.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-3 rounded-2xl bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">内部リンク</p>
                  {record.internalLinks.length === 0 ? (
                    <p className="text-sm text-slate-300">内部リンクが見つかりませんでした。</p>
                  ) : (
                    <ul className="space-y-2 text-sm text-slate-200">
                      {record.internalLinks.map((link) => (
                        <li key={link} className="truncate text-primary">
                          {link}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-3 rounded-2xl bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">キーワード頻度</p>
                  {record.keywords.length === 0 ? (
                    <p className="text-sm text-slate-300">キーワードを特定できませんでした。</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {record.keywords.map((keyword) => (
                        <Badge key={keyword.word} className="bg-slate-800 text-slate-200">
                          {keyword.word} ({keyword.count})
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-2xl bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">コンテンツ抜粋</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">
                    {record.summaryText || "本文が登録されていません。"}
                  </p>
                </div>
              </div>
            </ScrollArea>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

const SEO_TITLE_MIN = 5;
const SEO_TITLE_MAX = 45;
const SEO_SLUG_MAX = 60;

function analyzeSeoRecords(records: ContentRecord[]): SeoRecord[] {
  return records
    .filter((record) => record.status === "published")
    .map((record) => {
      const normalizedTitle = record.title?.trim() ?? "";
      const titleLength = normalizedTitle.length;
      const titleIssues = evaluateTitleIssues(titleLength);
      const slugIssues = evaluateSlugIssues(record.slug ?? "");
      const internalLinks = extractInternalLinks(record.body);
      const keywords = extractKeywords(record.body);
      const advice = [...titleIssues, ...slugIssues];
      if (internalLinks.length === 0) {
        advice.push("内部リンクを追加しましょう");
      }

      return {
        ...record,
        typeLabel: TYPE_LABEL_MAP[record.type],
        titleLength,
        titleIssues,
        slugIssues,
        internalLinkCount: internalLinks.length,
        internalLinks,
        keywords,
        advice,
        seoStatus: advice.length > 0 ? "needs_attention" : "ok",
        summaryText: record.body ? record.body.slice(0, 600) : "",
      };
    });
}

function evaluateTitleIssues(length: number): string[] {
  const issues: string[] = [];
  if (length === 0) {
    issues.push("タイトルが設定されていません");
    return issues;
  }

  if (length < SEO_TITLE_MIN) {
    issues.push("タイトルが短すぎます");
  }
  if (length > SEO_TITLE_MAX) {
    issues.push("タイトルが長すぎる可能性があります");
  }
  return issues;
}

function evaluateSlugIssues(slugRaw: string): string[] {
  const issues: string[] = [];
  const slug = slugRaw?.trim() ?? "";
  if (!slug) {
    issues.push("スラッグが設定されていません");
    return issues;
  }
  if (slug.length > SEO_SLUG_MAX) {
    issues.push("スラッグが長すぎます");
  }
  if (/\s/.test(slug)) {
    issues.push("スラッグにスペースが含まれています");
  }
  if (!/^[a-z0-9-/]+$/.test(slug)) {
    issues.push("スラッグは半角英数字とハイフンで構成してください");
  }
  return issues;
}

function extractInternalLinks(content: string | null): string[] {
  if (!content) return [];
  const matches = content.matchAll(/\[[^\]]*\]\((\/[^)\s]+)\)/g);
  return Array.from(matches, (match) => match[1]).filter((link): link is string => !!link);
}

function extractKeywords(content: string | null): KeywordStat[] {
  if (!content) return [];
  const cleaned = content.replace(/https?:\/\/\S+/g, " ");
  const matches =
    cleaned.match(/[A-Za-z0-9\u3040-\u30FF\u4E00-\u9FFF]{2,}/g) ?? [];
  const stopWords = new Set(["です", "ます", "こと", "よう", "nightbase", "NightBase", "する"]);
  const freq = new Map<string, number>();

  matches.forEach((word) => {
    const normalized = word.toLowerCase();
    if (stopWords.has(normalized)) {
      return;
    }
    freq.set(normalized, (freq.get(normalized) ?? 0) + 1);
  });

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }));
}

export default function AdminAnalyticsPage() {
  return (
    <AdminProtected>
      {({ supabase }) => <AnalyticsContent supabase={supabase} />}
    </AdminProtected>
  );
}

export const dynamic = 'force-dynamic';
