"use client";

import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatDateTime } from "@/lib/utils";

export type ManualTableItem = {
  id: string;
  title: string;
  body_markdown: string | null;
  slug: string;
  category: string | null;
  status: string;
  published_at: string | null;
  thumbnail_url: string | null;
};

type ManualTableProps = {
  items: ManualTableItem[];
};

export function ManualTable({ items }: ManualTableProps) {
  const router = useRouter();

  return (
    <Table className="min-w-full">
      <TableHeader>
        <TableRow className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-xs uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
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
            <TableCell colSpan={6} className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
              条件に一致するマニュアルがありません。
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              onClick={() => router.push(`/admin/cms/manuals/${item.id}`)}
            >
              <TableCell className="px-6 text-sm text-gray-900 dark:text-gray-100 text-center">{item.title}</TableCell>
              <TableCell className="text-xs text-gray-600 dark:text-gray-400 text-center">{item.slug}</TableCell>
              <TableCell className="text-sm text-gray-700 dark:text-gray-300 text-center">{item.category ?? "未分類"}</TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={item.status === "published" ? "success" : "neutral"}
                  className={cn(
                    "px-3 py-1 text-xs",
                    item.status === "published" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  )}
                >
                  {item.status === "published" ? "公開" : "下書き"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-600 dark:text-gray-400 text-center">{formatDateTime(item.published_at)}</TableCell>
              <TableCell className="w-32 text-center">
                {item.thumbnail_url ? (
                  <div className="inline-flex h-10 w-16 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-gray-500">なし</span>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
