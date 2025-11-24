"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { CmsListLayout, type StatusTab } from "@/components/admin/cms/CmsListLayout";
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
};

const STATUS_TABS: StatusTab[] = [
  { value: "all", label: "すべて" },
  { value: "published", label: "公開" },
  { value: "draft", label: "下書き" },
];

type StatusFilter = (typeof STATUS_TABS)[number]["value"];

function ManualListContent({ supabase }: { supabase: any }) {
  const [state, setState] = useState<ManualListState>({
    loading: true,
    error: null,
    items: [],
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [tagFilter, setTagFilter] = useState<string>("すべて");

  const loadManuals = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const { data, error } = await supabase
      .from("cms_entries")
      .select("id, type, title, slug, body, status, published_at, tags, cover_image_url")
      .eq("type", "manual")
      .order("published_at", { ascending: true, nullsFirst: false })
      .order("title", { ascending: true });

    if (error) {
      console.error("マニュアルの取得に失敗しました", error);
      setState((prev) => ({ ...prev, loading: false, error: "マニュアルの取得に失敗しました" }));
      return;
    }

    const rows = (data ?? []) as any[];
    const items: ManualTableItem[] = rows.map((item) => {
      const tags: string[] = Array.isArray(item.tags)
        ? (item.tags as string[])
        : [];

      const primaryCategory = tags.length > 0 ? tags[0] : null;

      return {
        id: item.id,
        title: item.title,
        slug: item.slug,
        body_markdown: item.body ?? null,
        category: primaryCategory,
        status: item.status ?? "draft",
        published_at: item.published_at ?? null,
        thumbnail_url: item.cover_image_url ?? null,
      };
    });

    setState({ loading: false, error: null, items });
  }, [supabase]);

  useEffect(() => {
    loadManuals();
  }, [loadManuals]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    state.items.forEach((item) => {
      if (typeof item.category === "string" && item.category.length > 0) {
        set.add(item.category);
      }
    });
    return ["すべて", ...Array.from(set).sort()];
  }, [state.items]);

  const filteredItems = useMemo(() => {
    return state.items.filter((item) => {
      const matchesSearch = search
        ? `${item.title} ${item.body_markdown ?? ""}`.toLowerCase().includes(search.toLowerCase())
        : true;
      const matchesStatus =
        status === "all" ? true : status === "published" ? item.status === "published" : item.status !== "published";
      const matchesTag =
        tagFilter === "すべて" ? true : (item.category ?? "").toLowerCase() === tagFilter.toLowerCase();
      return matchesSearch && matchesStatus && matchesTag;
    });
  }, [search, state.items, status, tagFilter]);

  if (state.loading) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          マニュアルを読み込んでいます…
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-8">
        <div className="space-y-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-8 text-center text-red-900">
          <p>{state.error}</p>
          <Button variant="outline" className="border-red-300 text-red-900" onClick={loadManuals}>
            再読み込み
          </Button>
        </div>
      </div>
    );
  }

  const tagFilterControl = (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs uppercase tracking-[0.3em] text-slate-400">タグ</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between border-slate-300 bg-white text-slate-700 md:w-64">
            <span>{tagFilter}</span>
            <Filter className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>タグで絞り込み</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {tagOptions.map((option) => (
            <DropdownMenuItem key={option} onSelect={() => setTagFilter(option)}>
              {option}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="space-y-10 p-8">
      <CmsListLayout
        title="マニュアル"
        description="マニュアルコンテンツの公開・下書きを管理します。"
        searchPlaceholder="タイトルやスラッグで検索"
        searchValue={search}
        onSearchChange={setSearch}
        statusTabs={STATUS_TABS}
        statusValue={status}
        onStatusChange={(value) => setStatus(value as StatusFilter)}
        createHref="/admin/cms/manuals/new"
        createLabel="新規作成"
        secondaryFilters={tagFilterControl}
      >
        <ManualTable items={filteredItems} />
      </CmsListLayout>
    </div>
  );
}

export default function AdminManualListPage() {
  return (
    <AdminProtected>
      {({ supabase }) => <ManualListContent supabase={supabase} />}
    </AdminProtected>
  );
}
