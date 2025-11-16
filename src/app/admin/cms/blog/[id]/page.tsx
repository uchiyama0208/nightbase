"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { BlogEditor, type BlogEditorValues } from "@/components/admin/cms/BlogEditor";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: { id: string };
}

export default function AdminBlogEditorPage({ params }: PageProps) {
  return (
    <AdminProtected>
      {({ supabase }) => <BlogEditorLoader supabase={supabase} id={params.id} />}
    </AdminProtected>
  );
}

function BlogEditorLoader({ supabase, id }: { supabase: any; id: string }) {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: BlogEditorValues | null;
  }>({ loading: true, error: null, data: null });

  const fetchPost = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, title, slug, content, excerpt, category, cover_image_url, status, published_at")
      .eq("id", id)
      .maybeSingle();

    console.log("[AdminBlogEditorPage] fetch result", { data, error });

    if (error) {
      setState({ loading: false, error: error.message ?? "記事の取得に失敗しました", data: null });
      return;
    }

    if (!data) {
      setState({ loading: false, error: "記事が見つかりません", data: null });
      return;
    }

    const mapped: BlogEditorValues = {
      id: data.id,
      previousSlug: data.slug,
      title: data.title,
      slug: data.slug,
      content: data.content ?? "",
      excerpt: data.excerpt ?? "",
      category: data.category ?? "",
      cover_image_url: data.cover_image_url ?? "",
      status: (data.status as BlogEditorValues["status"]) ?? "draft",
      published_at: data.published_at ?? ""
    };

    setState({ loading: false, error: null, data: mapped });
  }, [supabase, id]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  if (state.loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-12 text-slate-300">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>記事を読み込んでいます…</p>
      </div>
    );
  }

  if (state.error || !state.data) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-red-400/20 bg-red-500/5 p-10 text-center text-sm text-red-100">
        <p>{state.error ?? "記事データを取得できませんでした。"}</p>
        <Button onClick={fetchPost} variant="outline" className="gap-2 border-white/30 text-white">
          <RefreshCw className="h-4 w-4" /> 再読み込み
        </Button>
      </div>
    );
  }

  return <BlogEditor initialData={state.data} supabaseClient={supabase} />;
}
