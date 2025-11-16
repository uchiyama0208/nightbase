"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { CmsListLayout, type StatusTab } from "@/components/admin/cms/CmsListLayout";
import { CaseStudyTable, type CaseStudyTableItem } from "@/components/admin/cms/CaseStudyTable";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { decodeCaseStudyContent, formatCaseStudyIndustry } from "@/lib/caseStudies";

type CaseStudyListState = {
  loading: boolean;
  error: string | null;
  items: CaseStudyTableItem[];
  industries: string[];
};

const STATUS_TABS: StatusTab[] = [
  { value: "all", label: "すべて" },
  { value: "published", label: "公開" },
  { value: "draft", label: "下書き" },
];

type StatusFilter = (typeof STATUS_TABS)[number]["value"];

function CaseStudyListContent({ supabase }: { supabase: any }) {
  const [state, setState] = useState<CaseStudyListState>({
    loading: true,
    error: null,
    items: [],
    industries: [],
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [industry, setIndustry] = useState<string>("すべて");

  const loadCaseStudies = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const { data, error } = await supabase
      .from("case_studies")
      .select("*")
      .order("updated_at", { ascending: false });

    console.log("[AdminCaseStudies] list result", { data, error });

    if (error) {
      console.error("[AdminCaseStudies] 導入事例の取得に失敗しました", error);
      setState((prev) => ({ ...prev, loading: false, error: "導入事例の取得に失敗しました" }));
      return;
    }

    const rows = (data ?? []) as any[];
    const items: CaseStudyTableItem[] = rows.map((row) => {
      const content = decodeCaseStudyContent(row.summary ?? null);

      return {
        id: row.id,
        title: row.title,
        store_name: content.store_name ?? null,
        industry: row.industry,
        summary: content.summary ?? null,
        status: row.status ?? "draft",
        published_at: row.published_at ?? null,
        updated_at: row.updated_at ?? null,
      };
    });

    const industries = Array.from(
      new Set(
        items
          .map((item) => item.industry)
          .filter((industry): industry is string => typeof industry === "string" && industry.length > 0)
      )
    ).sort();

    setState({ loading: false, error: null, items, industries });
  }, [supabase]);

  useEffect(() => {
    loadCaseStudies();
  }, [loadCaseStudies]);

  const industryOptions = useMemo(() => ["すべて", ...state.industries], [state.industries]);

  const filteredItems = useMemo(() => {
    return state.items.filter((item) => {
      const matchesSearch = search
        ? `${item.title} ${item.store_name ?? ""} ${item.summary ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;
      const matchesStatus =
        status === "all" ? true : status === "published" ? item.status === "published" : item.status !== "published";
      const matchesIndustry =
        industry === "すべて" ? true : (item.industry ?? "").toLowerCase() === industry.toLowerCase();

      return matchesSearch && matchesStatus && matchesIndustry;
    });
  }, [industry, search, state.items, status]);

  if (state.loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
        導入事例を読み込んでいます…
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="space-y-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-8 text-center text-red-100">
        <p>{state.error}</p>
        <Button variant="outline" className="border-white/20 text-white" onClick={loadCaseStudies}>
          再読み込み
        </Button>
      </div>
    );
  }

  const industryFilter = (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs uppercase tracking-[0.3em] text-slate-400">業種</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between bg-slate-900/60 text-slate-200 md:w-64">
            <span>{industry === "すべて" ? "すべて" : formatCaseStudyIndustry(industry)}</span>
            <Filter className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>業種で絞り込み</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {industryOptions.map((option) => (
            <DropdownMenuItem key={option} onSelect={() => setIndustry(option)}>
              {option === "すべて" ? option : formatCaseStudyIndustry(option)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <CmsListLayout
      title="導入事例"
      description="case_studies テーブルから公開・下書きの導入ストーリーを管理します。"
      searchPlaceholder="タイトルやスラッグで検索"
      searchValue={search}
      onSearchChange={setSearch}
      statusTabs={STATUS_TABS}
      statusValue={status}
      onStatusChange={(value) => setStatus(value as StatusFilter)}
      createHref="/admin/cms/case-studies/new"
      createLabel="新規作成"
      secondaryFilters={industryFilter}
    >
      <CaseStudyTable items={filteredItems} />
    </CmsListLayout>
  );
}

export default function AdminCaseStudyListPage() {
  return (
    <AdminProtected>
      {({ supabase }) => <CaseStudyListContent supabase={supabase} />}
    </AdminProtected>
  );
}
