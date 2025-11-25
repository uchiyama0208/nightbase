"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FileText, NotebookPen, ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatDateTime } from "@/lib/utils";

export type StatusCounts = {
  published: number;
  draft: number;
};

type RecentContentRow = {
  id: string;
  title: string;
  status: string;
  updatedAt: string | null;
  type: "ブログ" | "導入事例" | "マニュアル";
  editHref: string;
  statusLabel: string;
};

type AdminDashboardProps = {
  supabaseClient: any;
};

type CmsEntryType = "blog" | "case_study" | "manual";

async function fetchStatusCounts(supabase: any, type: CmsEntryType): Promise<StatusCounts> {
  const [publishedRes, draftRes] = await Promise.all([
    supabase
      .from("cms_entries")
      .select("id", { count: "exact", head: true })
      .eq("type", type)
      .eq("status", "published"),
    supabase
      .from("cms_entries")
      .select("id", { count: "exact", head: true })
      .eq("type", type)
      .neq("status", "published"),
  ]);

  if (publishedRes.error) {
    console.error(`cms_entries(${type})の公開件数取得に失敗しました`, publishedRes.error);
  }
  if (draftRes.error) {
    console.error(`cms_entries(${type})の下書き件数取得に失敗しました`, draftRes.error);
  }

  return {
    published: publishedRes.count ?? 0,
    draft: draftRes.count ?? 0,
  };
}

async function fetchRecentContent(supabase: any): Promise<RecentContentRow[]> {
  const { data, error } = await supabase
    .from("cms_entries")
    .select("id, type, title, status, published_at")
    .in("type", ["blog", "case_study", "manual"])
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(18);

  if (error) {
    console.error("最近のコンテンツの取得に失敗しました", error);
    return [];
  }

  const rows = (data ?? []) as Array<{
    id: string;
    type: CmsEntryType;
    title: string | null;
    status: string | null;
    published_at: string | null;
  }>;

  const recent: RecentContentRow[] = rows.map((row) => {
    const updatedAt = row.published_at ?? null;
    const typeLabel =
      row.type === "blog" ? "ブログ" : row.type === "case_study" ? "導入事例" : "マニュアル";
    const editHref =
      row.type === "blog"
        ? `/admin/cms/blog/${row.id}`
        : row.type === "case_study"
        ? `/admin/cms/case-studies/${row.id}`
        : `/admin/cms/manuals/${row.id}`;

    return {
      id: row.id,
      title: row.title ?? "(無題)",
      status: row.status ?? "draft",
      updatedAt,
      type: typeLabel,
      editHref,
      statusLabel: row.status === "published" ? "公開中" : "下書き",
    };
  });

  return recent
    .sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 9);
}

export function AdminDashboard({ supabaseClient }: AdminDashboardProps) {
  const [summaryCounts, setSummaryCounts] = useState({
    blog: { published: 0, draft: 0 },
    caseStudies: { published: 0, draft: 0 },
    manuals: { published: 0, draft: 0 },
  });
  const [recent, setRecent] = useState<RecentContentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      try {
        const [blog, cases, manuals, latest] = await Promise.all([
          fetchStatusCounts(supabaseClient, "blog"),
          fetchStatusCounts(supabaseClient, "case_study"),
          fetchStatusCounts(supabaseClient, "manual"),
          fetchRecentContent(supabaseClient),
        ]);

        if (!isMounted) return;
        setSummaryCounts({ blog, caseStudies: cases, manuals });
        setRecent(latest);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [supabaseClient]);

  const summaryCards = [
    {
      title: "ブログ",
      description: "NightBase ブログの記事を管理",
      href: "/admin/cms/blog",
      counts: summaryCounts.blog,
      type: "blog" as const,
    },
    {
      title: "導入事例",
      description: "導入ストーリーを更新",
      href: "/admin/cms/case-studies",
      counts: summaryCounts.caseStudies,
      type: "case" as const,
    },
    {
      title: "マニュアル",
      description: "社内向けナレッジを整備",
      href: "/admin/cms/manuals",
      counts: summaryCounts.manuals,
      type: "manual" as const,
    },
  ];

  const summaryIcon = (type: "blog" | "case" | "manual") => {
    switch (type) {
      case "blog":
        return <FileText className="h-5 w-5" />;
      case "case":
        return <ScrollText className="h-5 w-5" />;
      default:
        return <NotebookPen className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-10 p-8">
      <section className="grid gap-6 md:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.title} className="border border-slate-200 bg-white">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-slate-900">{card.title}</CardTitle>
                <CardDescription className="text-slate-500">{card.description}</CardDescription>
              </div>
              <div className="rounded-2xl bg-slate-900 p-3 text-white">
                {summaryIcon(card.type)}
              </div>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="space-y-2">
                <p className="text-sm text-slate-500">公開中</p>
                <p className="text-3xl font-semibold text-slate-900">
                  {loading ? "--" : card.counts.published}
                </p>
              </div>
              <div className="space-y-2 text-right">
                <p className="text-sm text-slate-500">下書き</p>
                <p className="text-3xl font-semibold text-slate-900">
                  {loading ? "--" : card.counts.draft}
                </p>
              </div>
            </CardContent>
            <div className="flex justify-end px-6 pb-6">
              <Button asChild variant="ghost" className="gap-2 text-sm text-primary hover:text-primary/80">
                <Link href={card.href}>
                  管理ページへ <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">最近更新されたコンテンツ</h2>
            <p className="text-sm text-slate-500">Supabase に保存された最新の更新履歴を確認できます。</p>
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow className="border-b border-slate-100">
                <TableHead className="px-6">種別</TableHead>
                <TableHead>タイトル</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead className="text-right">最終更新</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-400">
                    読み込み中です…
                  </TableCell>
                </TableRow>
              ) : recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-400">
                    まだ更新履歴がありません。
                  </TableCell>
                </TableRow>
              ) : (
                recent.map((item) => (
                  <TableRow key={`${item.type}-${item.id}`} className="border-white/5">
                    <TableCell className="px-6">
                      <Badge variant="outline" className="border-slate-300 bg-slate-50 text-xs text-slate-700">
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm text-slate-900">{item.title}</TableCell>
                    <TableCell>
                      <Badge
                        variant={item.status === "published" ? "success" : "neutral"}
                        className={cn(
                          "px-3 py-1 text-xs",
                          item.status === "published"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-slate-800 text-slate-300"
                        )}
                      >
                        {item.statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-600">
                      {formatDateTime(item.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline" className="border-slate-300 text-slate-700">
                        <Link href={item.editHref}>編集</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
