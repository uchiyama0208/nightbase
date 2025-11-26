"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { BlogEditor, type BlogEditorValues } from "@/components/admin/cms/BlogEditor";
import { Button } from "@/components/ui/button";

export default function AdminCaseStudyEditorPage() {
  const params = useParams<{ id?: string | string[] }>();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  return (
    <AdminProtected>
      {({ supabase }) => (
        id ? (
          <CaseStudyLoader supabase={supabase} id={id} />
        ) : (
          <div className="rounded-3xl border border-red-400/40 bg-red-500/10 p-8 text-center text-sm text-red-100">
            編集対象の導入事例 ID が見つかりませんでした。
          </div>
        )
      )}
    </AdminProtected>
  );
}

function CaseStudyLoader({ supabase, id }: { supabase: any; id: string }) {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: BlogEditorValues | null;
  }>({ loading: true, error: null, data: null });

  const fetchCaseStudy = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { data, error } = await supabase
      .from("cms_entries")
      .select("id, type, title, slug, body, excerpt, tags, cover_image_url, status, published_at")
      .eq("id", id)
      .eq("type", "case_study")
      .maybeSingle();

    console.log("[AdminCaseStudyEditorPage] fetch result", { data, error });

    if (error) {
      setState({ loading: false, error: error.message ?? "導入事例の取得に失敗しました", data: null });
      return;
    }

    if (!data) {
      setState({ loading: false, error: "導入事例が見つかりません", data: null });
      return;
    }

    const tags: string[] = Array.isArray((data as any).tags) ? ((data as any).tags as string[]) : [];
    const primaryCategory = tags.length > 0 ? tags[0] : "";
    const mapped: BlogEditorValues = {
      id: data.id,
      previousSlug: data.slug,
      title: data.title ?? "",
      slug: data.slug ?? "",
      content: (data as any).body ?? "",
      excerpt: (data as any).excerpt ?? "",
      category: primaryCategory,
      categories: tags,
      cover_image_url: (data as any).cover_image_url ?? "",
      status: (data.status as BlogEditorValues["status"]) ?? "draft",
      published_at: data.published_at ?? "",
    };

    setState({ loading: false, error: null, data: mapped });
  }, [supabase, id]);

  useEffect(() => {
    fetchCaseStudy();
  }, [fetchCaseStudy]);

  if (state.loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-12 text-slate-300">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>導入事例を読み込んでいます…</p>
      </div>
    );
  }

  if (state.error || !state.data) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-red-400/20 bg-red-500/5 p-10 text-center text-sm text-red-100">
        <p>{state.error ?? "導入事例を取得できませんでした。"}</p>
        <Button onClick={fetchCaseStudy} variant="outline" className="gap-2 border-white/30 text-white">
          <RefreshCw className="h-4 w-4" /> 再読み込み
        </Button>
      </div>
    );
  }
  return (
    <BlogEditor
      initialData={state.data}
      supabaseClient={supabase}
      entryType="case_study"
      entityLabel="導入事例"
      newTitle="新規事例を作成"
      editTitle="事例を編集"
      redirectPath="/admin/cms/case-studies"
      storageFolder="case-studies"
    />
  );
}

export const dynamic = 'force-dynamic';
