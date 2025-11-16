"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { CmsListLayout, type StatusTab } from "@/components/admin/cms/CmsListLayout";
import { BlogTable, type BlogTableItem } from "@/components/admin/cms/BlogTable";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type BlogListState = {
  loading: boolean;
  error: string | null;
  items: BlogTableItem[];
  categories: string[];
};

const STATUS_TABS: StatusTab[] = [
  { value: "all", label: "すべて" },
  { value: "published", label: "公開" },
  { value: "draft", label: "下書き" },
];

type StatusFilter = (typeof STATUS_TABS)[number]["value"];

function BlogListContent({ supabase }: { supabase: any }) {
  const [state, setState] = useState<BlogListState>({
    loading: true,
    error: null,
    items: [],
    categories: [],
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<string>("すべて");

  const loadPosts = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, title, slug, status, category, published_at, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("ブログ記事一覧の取得に失敗しました", error);
      setState((prev) => ({ ...prev, loading: false, error: "ブログ記事の取得に失敗しました" }));
      return;
    }

    const rows = (data ?? []) as any[];
    const items: BlogTableItem[] = rows.map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      status: item.status ?? "draft",
      category: item.category,
      published_at: item.published_at,
      updated_at: item.updated_at,
    }));

    const categories = Array.from(
      new Set(
        items
          .map((item) => item.category)
          .filter((category): category is string => typeof category === "string" && category.length > 0)
      )
    ).sort();

    setState({ loading: false, error: null, items, categories });
  }, [supabase]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const categoryOptions = useMemo(() => ["すべて", ...state.categories], [state.categories]);

  const filteredItems = useMemo(() => {
    return state.items.filter((item) => {
      const matchesSearch = search
        ? `${item.title} ${item.slug}`.toLowerCase().includes(search.toLowerCase())
        : true;
      const matchesStatus =
        status === "all" ? true : status === "published" ? item.status === "published" : item.status !== "published";
      const matchesCategory =
        category === "すべて" ? true : (item.category ?? "未分類").toLowerCase() === category.toLowerCase();

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [category, search, state.items, status]);

  if (state.loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
        ブログ記事を読み込んでいます…
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="space-y-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-8 text-center text-red-100">
        <p>{state.error}</p>
        <Button variant="outline" className="border-white/20 text-white" onClick={loadPosts}>
          再読み込み
        </Button>
      </div>
    );
  }

  const categoryFilter = (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs uppercase tracking-[0.3em] text-slate-400">カテゴリ</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between bg-slate-900/60 text-slate-200 md:w-64">
            <span>{category}</span>
            <Filter className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>カテゴリで絞り込み</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {categoryOptions.map((option) => (
            <DropdownMenuItem key={option} onSelect={() => setCategory(option)}>
              {option}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <CmsListLayout
      title="ブログ記事"
      description="Supabase の blog_posts テーブルと同期した記事リストです。"
      searchPlaceholder="タイトルやスラッグで検索"
      searchValue={search}
      onSearchChange={setSearch}
      statusTabs={STATUS_TABS}
      statusValue={status}
      onStatusChange={(value) => setStatus(value as StatusFilter)}
      createHref="/admin/cms/blog/new"
      createLabel="新規作成"
      secondaryFilters={categoryFilter}
    >
      <BlogTable items={filteredItems} />
    </CmsListLayout>
  );
}

export default function AdminBlogListPage() {
  return (
    <AdminProtected>
      {({ supabase }) => <BlogListContent supabase={supabase} />}
    </AdminProtected>
  );
}
