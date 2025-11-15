"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter, LibraryBig, PlusCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatDateTime } from "@/lib/utils";

export type ManualTableItem = {
  id: string;
  title: string;
  section: string;
  body_markdown: string | null;
  order: number;
  status: string;
  updated_at: string | null;
  published_at: string | null;
};

type ManualTableProps = {
  items: ManualTableItem[];
  sections: string[];
};

const STATUS_TABS = [
  { value: "all", label: "すべて" },
  { value: "published", label: "公開" },
  { value: "draft", label: "下書き" }
] as const;

export function ManualTable({ items, sections }: ManualTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]["value"]>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("すべて");

  const options = useMemo(() => ["すべて", ...sections], [sections]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = search
        ? `${item.title} ${item.body_markdown ?? ""}`.toLowerCase().includes(search.toLowerCase())
        : true;
      const matchesStatus =
        status === "all" ? true : status === "published" ? item.status === "published" : item.status !== "published";
      const matchesCategory = sectionFilter === "すべて" ? true : item.section === sectionFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, search, sectionFilter, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-white">マニュアル</h2>
          <p className="text-sm text-slate-400">manuals テーブルの公開・下書きマニュアルを編集します。</p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild className="gap-2 bg-primary text-white">
            <Link href="/admin/cms/manuals/new">
              <PlusCircle className="h-4 w-4" /> 新規作成
            </Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <Filter className="h-4 w-4" /> フィルター
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-sm bg-slate-950/95 text-slate-100">
              <SheetHeader>
                <SheetTitle>フィルター</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="manual-search" className="text-slate-400">
                    検索
                  </Label>
                  <Input
                    id="manual-search"
                    placeholder="マニュアルタイトルで検索"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="bg-slate-900/60"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-400">ステータス</Label>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_TABS.map((tab) => (
                      <Button
                        key={`manual-status-${tab.value}`}
                        variant={status === tab.value ? "default" : "outline"}
                        className={cn(
                          "rounded-full px-4",
                          status === tab.value ? "bg-primary text-white" : "border-slate-700/60 text-slate-200"
                        )}
                        onClick={() => setStatus(tab.value)}
                      >
                        {tab.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-400">セクション</Label>
                  <div className="space-y-2">
                    {options.map((option) => (
                      <Button
                        key={`manual-section-${option}`}
                        variant={sectionFilter === option ? "default" : "outline"}
                        className={cn(
                          "w-full justify-start",
                          sectionFilter === option ? "bg-primary text-white" : "border-slate-700/60 text-slate-200"
                        )}
                        onClick={() => setSectionFilter(option)}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>
                <SheetClose asChild>
                  <Button variant="ghost" className="w-full text-primary">
                    閉じる
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="マニュアルタイトルで検索"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="bg-slate-900/60 sm:max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={status} onValueChange={(value) => setStatus(value as typeof status)}>
            <TabsList>
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={`manual-status-desktop-${tab.value}`} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsContent key={`manual-status-content-${tab.value}`} value={tab.value} />
            ))}
          </Tabs>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between bg-slate-900/60 text-slate-200 sm:w-56">
                <span>{sectionFilter}</span>
                <LibraryBig className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>セクションで絞り込み</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {options.map((option) => (
                <DropdownMenuItem key={`manual-section-dropdown-${option}`} onSelect={() => setSectionFilter(option)}>
                  {option}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 bg-slate-900/70 text-xs uppercase tracking-[0.25em] text-slate-400">
              <TableHead className="px-6">タイトル</TableHead>
              <TableHead>セクション</TableHead>
              <TableHead>並び順</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>公開日</TableHead>
              <TableHead className="text-right">最終更新</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-400">
                  条件に一致するマニュアルがありません。
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id} className="border-white/5">
                  <TableCell className="px-6 text-sm text-white">{item.title}</TableCell>
                  <TableCell className="text-sm text-slate-300">{item.section}</TableCell>
                  <TableCell className="text-sm text-slate-300">{item.order}</TableCell>
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
                      <Link href={`/admin/cms/manuals/${item.id}`}>編集</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
