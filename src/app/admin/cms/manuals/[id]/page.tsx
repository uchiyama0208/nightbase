"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { ManualEditor, type ManualEditorValues } from "@/components/admin/cms/ManualEditor";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: { id: string };
}

export default function AdminManualEditorPage({ params }: PageProps) {
  return (
    <AdminProtected>
      {({ supabase }) => <ManualLoader supabase={supabase} id={params.id} />}
    </AdminProtected>
  );
}

function ManualLoader({ supabase, id }: { supabase: any; id: string }) {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: ManualEditorValues | null;
  }>({ loading: true, error: null, data: null });

  const fetchManual = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { data, error } = await supabase
      .from("manuals")
      .select("id, title, slug, section, body_markdown, order, status, published_at")
      .eq("id", id)
      .maybeSingle();

    console.log("[AdminManualEditorPage] fetch result", { data, error });

    if (error) {
      setState({ loading: false, error: error.message ?? "マニュアルの取得に失敗しました", data: null });
      return;
    }

    if (!data) {
      setState({ loading: false, error: "マニュアルが見つかりません", data: null });
      return;
    }

    const mapped: ManualEditorValues = {
      id: data.id,
      title: data.title,
      slug: data.slug,
      section: data.section ?? "general",
      body_markdown: data.body_markdown ?? "",
      order: typeof data.order === "number" ? data.order : 0,
      status: (data.status as ManualEditorValues["status"]) ?? "draft",
      published_at: data.published_at ?? ""
    };

    setState({ loading: false, error: null, data: mapped });
  }, [supabase, id]);

  useEffect(() => {
    fetchManual();
  }, [fetchManual]);

  if (state.loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-12 text-slate-300">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>マニュアルを読み込んでいます…</p>
      </div>
    );
  }

  if (state.error || !state.data) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-red-400/20 bg-red-500/5 p-10 text-center text-sm text-red-100">
        <p>{state.error ?? "マニュアルを取得できませんでした。"}</p>
        <Button onClick={fetchManual} variant="outline" className="gap-2 border-white/30 text-white">
          <RefreshCw className="h-4 w-4" /> 再読み込み
        </Button>
      </div>
    );
  }

  return <ManualEditor initialData={state.data} supabaseClient={supabase} />;
}
