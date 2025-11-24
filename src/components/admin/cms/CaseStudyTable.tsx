"use client";

import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatDateTime } from "@/lib/utils";

export type CaseStudyTableItem = {
  id: string;
  title: string;
  summary: string | null;
  slug: string | null;
  category: string | null;
  status: string;
  published_at: string | null;
  thumbnail_url: string | null;
};

type CaseStudyTableProps = {
  items: CaseStudyTableItem[];
};

export function CaseStudyTable({ items }: CaseStudyTableProps) {
  const router = useRouter();

  return (
    <Table className="min-w-full">
      <TableHeader>
        <TableRow className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.25em] text-slate-500">
          <TableHead className="px-6">事例タイトル</TableHead>
          <TableHead>スラッグ</TableHead>
          <TableHead>タグ</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead>公開日</TableHead>
          <TableHead className="w-32 text-center">サムネイル</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-400">
              条件に一致する導入事例がありません。
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
              onClick={() => router.push(`/admin/cms/case-studies/${item.id}`)}
            >
              <TableCell className="px-6 text-sm text-slate-900">{item.title}</TableCell>
              <TableCell className="text-xs text-slate-600">{item.slug ?? "-"}</TableCell>
              <TableCell className="text-sm text-slate-700">{item.category ?? "未分類"}</TableCell>
              <TableCell>
                <Badge
                  variant={item.status === "published" ? "success" : "neutral"}
                  className={cn(
                    "px-3 py-1 text-xs",
                    item.status === "published" ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"
                  )}
                >
                  {item.status === "published" ? "公開" : "下書き"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-slate-600">{formatDateTime(item.published_at)}</TableCell>
              <TableCell className="w-32 text-center">
                {item.thumbnail_url ? (
                  <div className="inline-flex h-10 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">なし</span>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
