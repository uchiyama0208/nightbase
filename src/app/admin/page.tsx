import Link from "next/link";
import { ArrowUpRight, FileText, NotebookPen, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createAdminServerClient } from "@/lib/auth";
import { formatDateTime, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StatusCounts = {
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

async function fetchStatusCounts(supabase: any, table: string): Promise<StatusCounts> {
  const [{ count: publishedCount, error: publishedError }, { count: draftCount, error: draftError }] =
    await Promise.all([
      supabase.from(table).select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from(table).select("id", { count: "exact", head: true }).neq("status", "published")
    ]);

  if (publishedError) {
    console.error(`${table}の公開件数取得に失敗しました`, publishedError);
  }
  if (draftError) {
    console.error(`${table}の下書き件数取得に失敗しました`, draftError);
  }

  return {
    published: publishedCount ?? 0,
    draft: draftCount ?? 0
  };
}

async function fetchRecentContent(supabase: any): Promise<RecentContentRow[]> {
  const [blogRes, caseRes, manualRes] = await Promise.all([
    supabase
      .from("blog_posts")
      .select("id, title, status, updated_at, published_at")
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("case_studies")
      .select("id, title, status, updated_at, published_at")
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("manuals")
      .select("id, title, status, updated_at, published_at")
      .order("updated_at", { ascending: false })
      .limit(6)
  ]);

  const recent: RecentContentRow[] = [];

  if (blogRes.error) {
    console.error("ブログ記事の取得に失敗しました", blogRes.error);
  }
  if (caseRes.error) {
    console.error("導入事例の取得に失敗しました", caseRes.error);
  }
  if (manualRes.error) {
    console.error("マニュアルの取得に失敗しました", manualRes.error);
  }

  blogRes.data?.forEach((post) => {
    recent.push({
      id: post.id,
      title: post.title,
      status: post.status,
      updatedAt: post.updated_at ?? post.published_at ?? null,
      type: "ブログ",
      editHref: `/admin/cms/blog/${post.id}`,
      statusLabel: post.status === "published" ? "公開中" : "下書き"
    });
  });

  caseRes.data?.forEach((entry) => {
    recent.push({
      id: entry.id,
      title: entry.title,
      status: entry.status,
      updatedAt: entry.updated_at ?? entry.published_at ?? null,
      type: "導入事例",
      editHref: `/admin/cms/case-studies/${entry.id}`,
      statusLabel: entry.status === "published" ? "公開中" : "下書き"
    });
  });

  manualRes.data?.forEach((manual) => {
    recent.push({
      id: manual.id,
      title: manual.title,
      status: manual.status,
      updatedAt: manual.updated_at ?? manual.published_at ?? null,
      type: "マニュアル",
      editHref: `/admin/cms/manuals/${manual.id}`,
      statusLabel: manual.status === "published" ? "公開中" : "下書き"
    });
  });

  return recent
    .sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 9);
}

function summaryCardIcon(type: "blog" | "case" | "manual") {
  switch (type) {
    case "blog":
      return <FileText className="h-5 w-5" />;
    case "case":
      return <ScrollText className="h-5 w-5" />;
    default:
      return <NotebookPen className="h-5 w-5" />;
  }
}

export default async function AdminDashboardPage() {
  const { supabase } = await createAdminServerClient();
  const adminSupabase = supabase as any;

  const [blogCounts, caseCounts, manualCounts, recent] = await Promise.all([
    fetchStatusCounts(adminSupabase, "blog_posts"),
    fetchStatusCounts(adminSupabase, "case_studies"),
    fetchStatusCounts(adminSupabase, "manuals"),
    fetchRecentContent(adminSupabase)
  ]);

  const summaryCards = [
    {
      title: "ブログ",
      description: "NightBase ブログの記事を管理",
      href: "/admin/cms/blog",
      counts: blogCounts,
      type: "blog" as const
    },
    {
      title: "導入事例",
      description: "導入ストーリーを更新",
      href: "/admin/cms/case-studies",
      counts: caseCounts,
      type: "case" as const
    },
    {
      title: "マニュアル",
      description: "社内向けナレッジを整備",
      href: "/admin/cms/manuals",
      counts: manualCounts,
      type: "manual" as const
    }
  ];

  return (
    <div className="space-y-10">
      <section className="grid gap-6 md:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.title} className="border-white/15 bg-white/10">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </div>
              <div className="rounded-2xl bg-slate-900/80 p-3 text-primary">
                {summaryCardIcon(card.type)}
              </div>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="space-y-2">
                <p className="text-sm text-slate-400">公開中</p>
                <p className="text-3xl font-semibold text-white">{card.counts.published}</p>
              </div>
              <div className="space-y-2 text-right">
                <p className="text-sm text-slate-400">下書き</p>
                <p className="text-3xl font-semibold text-white">{card.counts.draft}</p>
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

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">最近更新されたコンテンツ</h2>
            <p className="text-sm text-slate-400">
              Supabase に保存された最新の更新履歴を確認できます。
            </p>
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow className="border-white/10 bg-slate-900/60 text-xs uppercase tracking-[0.2em] text-slate-400">
                <TableHead className="px-6">種別</TableHead>
                <TableHead>タイトル</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead className="text-right">最終更新</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-400">
                    まだ更新履歴がありません。
                  </TableCell>
                </TableRow>
              ) : (
                recent.map((item) => (
                  <TableRow key={`${item.type}-${item.id}`} className="border-white/5">
                    <TableCell className="px-6">
                      <Badge variant="outline" className="border-white/20 bg-slate-900/60 text-xs text-slate-300">
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm text-white">{item.title}</TableCell>
                    <TableCell>
                      <Badge
                        variant={item.status === "published" ? "success" : "neutral"}
                        className={cn(
                          "px-3 py-1 text-xs",
                          item.status === "published" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-300"
                        )}
                      >
                        {item.statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-300">
                      {formatDateTime(item.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline" className="border-white/20 text-slate-100">
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
