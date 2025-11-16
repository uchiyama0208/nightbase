"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LibraryBig } from "lucide-react";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { CmsListLayout } from "@/components/admin/cms/CmsListLayout";
import { ManualTable, type ManualTableItem } from "@/components/admin/cms/ManualTable";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ManualListState = {
  loading: boolean;
  error: string | null;
  items: ManualTableItem[];
  sections: string[];
};

const STATUS_TABS = [
  { value: "all", label: "すべて" },
  { value: "published", label: "公開" },
  { value: "draft", label: "下書き" },
] as const;

type StatusFilter = (typeof STATUS_TABS)[number]["value"];

function ManualListContent({ supabase }: { supabase: any }) {
  const [state, setState] = useState<ManualListState>({
    loading: true,
    error: null,
    items: [],
    sections: [],
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("すべて");

  const loadManuals = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const { data, error } = await supabase
      .from("manuals")
      .select("id, title, slug, section, status, order, updated_at, published_at, body_markdown")
      .order("section", { ascending: true })
      .order("order", { ascending: true });

    if (error) {
      console.error("マニュアルの取得に失敗しました", error);
      setState((prev) => ({ ...prev, loading: false, error: "マニュアルの取得に失敗しました" }));
      return;
    }

    const rows = (data ?? []) as any[];
    const items: ManualTableItem[] = rows.map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      section: item.section,
      body_markdown: item.body_markdown ?? null,
      status: item.status ?? "draft",
      order: item.order ?? 0,
      updated_at: item.updated_at,
      published_at: item.published_at,
    }));

    const sections = Array.from(
      new Set(
        items
          .map((item) => item.section)
          .filter((section): section is string => typeof section === "string" && section.length > 0)
      )
    ).sort();

    setState({ loading: false, error: null, items, sections });
  }, [supabase]);

  useEffect(() => {
    loadManuals();
  }, [loadManuals]);

  const sectionOptions = useMemo(() => ["すべて", ...state.sections], [state.sections]);

  const filteredItems = useMemo(() => {
    return state.items.filter((item) => {
      const matchesSearch = search
        ? `${item.title} ${item.body_markdown ?? ""}`.toLowerCase().includes(search.toLowerCase())
        : true;
      const matchesStatus =
        status === "all" ? true : status === "published" ? item.status === "published" : item.status !== "published";
      const matchesSection = sectionFilter === "すべて" ? true : item.section === sectionFilter;

      return matchesSearch && matchesStatus && matchesSection;
    });
  }, [search, sectionFilter, state.items, status]);

  if (state.loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
        マニュアルを読み込んでいます…
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="space-y-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-8 text-center text-red-100">
        <p>{state.error}</p>
        <Button variant="outline" className="border-white/20 text-white" onClick={loadManuals}>
          再読み込み
        </Button>
      </div>
    );
  }

  const sectionFilterRow = (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs uppercase tracking-[0.3em] text-slate-400">セクション</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between bg-slate-900/60 text-slate-200 md:w-64">
            <span>{sectionFilter}</span>
            <LibraryBig className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>セクションで絞り込み</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sectionOptions.map((option) => (
            <DropdownMenuItem key={option} onSelect={() => setSectionFilter(option)}>
              {option}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <CmsListLayout
      title="マニュアル"
      description="manuals テーブルの公開・下書きマニュアルを管理します。"
      searchPlaceholder="マニュアルタイトルで検索"
      searchValue={search}
      onSearchChange={setSearch}
      statusTabs={STATUS_TABS}
      statusValue={status}
      onStatusChange={(value) => setStatus(value as StatusFilter)}
      createHref="/admin/cms/manuals/new"
      createLabel="新規作成"
      secondaryFilters={sectionFilterRow}
    >
      <ManualTable items={filteredItems} />
    </CmsListLayout>
  );
}

export default function AdminManualListPage() {
  return (
    <AdminProtected>
      {({ supabase }) => <ManualListContent supabase={supabase} />}
    </AdminProtected>
  );
}
