"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCaseStudyIndustry } from "@/lib/caseStudies";
import { cn, formatDateTime } from "@/lib/utils";

export type CaseStudyTableItem = {
  id: string;
  title: string;
  store_name: string | null;
  industry: string | null;
  summary: string | null;
  status: string;
  published_at: string | null;
  updated_at: string | null;
};

type CaseStudyTableProps = {
  items: CaseStudyTableItem[];
};

export function CaseStudyTable({ items }: CaseStudyTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-white/10 bg-slate-900/70 text-xs uppercase tracking-[0.25em] text-slate-400">
          <TableHead className="px-6">事例タイトル</TableHead>
          <TableHead>店舗 / 企業名</TableHead>
          <TableHead>業種</TableHead>
          <TableHead>サマリー</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead>公開日</TableHead>
          <TableHead className="text-right">最終更新</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-400">
              条件に一致する導入事例がありません。
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id} className="border-white/5">
              <TableCell className="px-6 text-sm text-white">{item.title}</TableCell>
              <TableCell className="text-sm text-slate-300">{item.store_name ?? "-"}</TableCell>
              <TableCell className="text-sm text-slate-300">{formatCaseStudyIndustry(item.industry ?? null)}</TableCell>
              <TableCell className="text-sm text-slate-300">{item.summary?.split(/\r?\n/)[0] ?? "-"}</TableCell>
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
              <TableCell className="text-right">
                <Button asChild size="sm" variant="outline" className="border-white/20 text-slate-100">
                  <Link href={`/admin/cms/case-studies/${item.id}`}>編集</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
