"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { BlogTable, type BlogTableItem } from "@/components/admin/cms/BlogTable";
import { Button } from "@/components/ui/button";

type BlogListState = {
  loading: boolean;
  error: string | null;
  items: BlogTableItem[];
  categories: string[];
};

function BlogListContent({ supabase }: { supabase: any }) {
  const [state, setState] = useState<BlogListState>({
    loading: true,
    error: null,
    items: [],
    categories: [],
  });

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

  return <BlogTable items={state.items} categories={state.categories} />;
}

export default function AdminBlogListPage() {
  return (
    <AdminProtected>
      {({ supabase }) => <BlogListContent supabase={supabase} />}
    </AdminProtected>
  );
}
