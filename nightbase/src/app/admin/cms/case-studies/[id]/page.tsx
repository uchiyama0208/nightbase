"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { CaseStudyEditor, type CaseStudyEditorValues } from "@/components/admin/cms/CaseStudyEditor";
import { decodeCaseStudyContent } from "@/lib/caseStudies";
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
    data: CaseStudyEditorValues | null;
  }>({ loading: true, error: null, data: null });

  const fetchCaseStudy = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { data, error } = await supabase
      .from("case_studies")
      .select("id, title, slug, industry, summary, cover_image_url, status, published_at")
      .eq("id", id)
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

    const parsed = decodeCaseStudyContent(data.summary ?? null);

    const mapped: CaseStudyEditorValues = {
      id: data.id,
      previousSlug: data.slug,
      title: data.title,
      store_name: parsed.store_name ?? "",
      slug: data.slug,
      industry: data.industry ?? "cabaret",
      summary: parsed.summary ?? "",
      problems: parsed.problems ?? "",
      solutions: parsed.solutions ?? "",
      results: parsed.results ?? "",
      cover_image_url: data.cover_image_url ?? "",
      status: (data.status as CaseStudyEditorValues["status"]) ?? "draft",
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

  return <CaseStudyEditor initialData={state.data} supabaseClient={supabase} />;
}
