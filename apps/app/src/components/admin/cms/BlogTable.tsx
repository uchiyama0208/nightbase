"use client";

import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatDateTime } from "@/lib/utils";

export type BlogTableItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string | null;
  published_at: string | null;
  thumbnail_url: string | null;
};

type BlogTableProps = {
  items: BlogTableItem[];
};

export function BlogTable({ items }: BlogTableProps) {
  const router = useRouter();

  return (
    <Table className="min-w-full">
      <TableHeader>
        <TableRow className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
          <TableHead className="px-6 text-center">タイトル</TableHead>
          <TableHead className="text-center">スラッグ</TableHead>
          <TableHead className="text-center">タグ</TableHead>
          <TableHead className="text-center">ステータス</TableHead>
          <TableHead className="text-center">公開日</TableHead>
          <TableHead className="w-32 text-center">サムネイル</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
              条件に一致する記事がありません。
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              onClick={() => router.push(`/admin/cms/blog/${item.id}`)}
            >
              <TableCell className="px-6 text-sm text-slate-900 dark:text-slate-100 text-center">{item.title}</TableCell>
              <TableCell className="text-xs text-slate-600 dark:text-slate-400 text-center">{item.slug}</TableCell>
              <TableCell className="text-sm text-slate-700 dark:text-slate-300 text-center">{item.category ?? "未分類"}</TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={item.status === "published" ? "success" : "neutral"}
                  className={cn(
                    "px-3 py-1 text-xs",
                    item.status === "published" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  )}
                >
                  {item.status === "published" ? "公開" : "下書き"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-slate-600 dark:text-slate-400 text-center">{formatDateTime(item.published_at)}</TableCell>
              <TableCell className="w-32 text-center">
                {item.thumbnail_url ? (
                  <div className="inline-flex h-10 w-16 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500">なし</span>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
