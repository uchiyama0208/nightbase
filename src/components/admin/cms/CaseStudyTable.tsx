"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, Filter, PlusCircle } from "lucide-react";

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
import { formatDateTime, cn } from "@/lib/utils";
import { formatCaseStudyIndustry } from "@/lib/caseStudies";

export type CaseStudyTableItem = {
  id: string;
  title: string;
  industry: string | null;
  description: string | null;
  status: string;
  published_at: string | null;
  updated_at: string | null;
};

type CaseStudyTableProps = {
  items: CaseStudyTableItem[];
  industries: string[];
};

const STATUS_TABS = [
  { value: "all", label: "すべて" },
  { value: "published", label: "公開" },
  { value: "draft", label: "下書き" }
] as const;

export function CaseStudyTable({ items, industries }: CaseStudyTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]["value"]>("all");
  const [industry, setIndustry] = useState<string>("すべて");

  const options = useMemo(() => ["すべて", ...industries], [industries]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = search
        ? `${item.title} ${item.description ?? ""}`.toLowerCase().includes(search.toLowerCase())
        : true;
      const matchesStatus =
        status === "all" ? true : status === "published" ? item.status === "published" : item.status !== "published";
      const matchesIndustry =
        industry === "すべて" ? true : item.industry?.toLowerCase() === industry.toLowerCase();

      return matchesSearch && matchesStatus && matchesIndustry;
    });
  }, [industry, items, search, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-white">導入事例</h2>
          <p className="text-sm text-slate-400">case_studies テーブルから公開・下書きの導入ストーリーを管理します。</p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild className="gap-2 bg-primary text-white">
            <Link href="/admin/cms/case-studies/new">
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
                  <Label htmlFor="search-case" className="text-slate-400">
                    検索
                  </Label>
                  <Input
                    id="search-case"
                    placeholder="事例名や店舗名で検索"
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
                        key={`case-status-${tab.value}`}
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
                  <Label className="text-slate-400">業種</Label>
                  <div className="space-y-2">
                    {options.map((option) => (
                      <Button
                        key={`case-industry-${option}`}
                        variant={industry === option ? "default" : "outline"}
                        className={cn(
                          "w-full justify-start",
                          industry === option ? "bg-primary text-white" : "border-slate-700/60 text-slate-200"
                        )}
                        onClick={() => setIndustry(option)}
                      >
                        {option === "すべて" ? option : formatCaseStudyIndustry(option)}
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
            placeholder="事例名や概要で検索"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="bg-slate-900/60 sm:max-w-sm"
          />
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={status} onValueChange={(value) => setStatus(value as typeof status)}>
            <TabsList>
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={`desk-status-${tab.value}`} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsContent key={`desk-content-${tab.value}`} value={tab.value} />
            ))}
          </Tabs>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between bg-slate-900/60 text-slate-200 sm:w-56">
                <span>{industry === "すべて" ? "すべて" : formatCaseStudyIndustry(industry)}</span>
                <Briefcase className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>業種で絞り込み</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {options.map((option) => (
                <DropdownMenuItem key={`desk-option-${option}`} onSelect={() => setIndustry(option)}>
                  {option === "すべて" ? option : formatCaseStudyIndustry(option)}
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
              <TableHead className="px-6">事例タイトル</TableHead>
              <TableHead>概要</TableHead>
              <TableHead>業種</TableHead>
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
                  条件に一致する導入事例がありません。
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id} className="border-white/5">
                  <TableCell className="px-6 text-sm text-white">{item.title}</TableCell>
                  <TableCell className="text-sm text-slate-300">{item.description?.split(/\r?\n/)[0] ?? "-"}</TableCell>
                  <TableCell className="text-sm text-slate-300">{formatCaseStudyIndustry(item.industry ?? null)}</TableCell>
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
      </div>
    </div>
  );
}
