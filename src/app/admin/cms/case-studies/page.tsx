"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { CaseStudyTable, type CaseStudyTableItem } from "@/components/admin/cms/CaseStudyTable";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CaseStudyListState = {
  loading: boolean;
  error: string | null;
  items: CaseStudyTableItem[];
  industries: string[];
};

function CaseStudyListContent({ supabase }: { supabase: any }) {
  const [state, setState] = useState<CaseStudyListState>({
    loading: true,
    error: null,
    items: [],
    industries: [],
  });

  const loadCaseStudies = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const { data, error } = await supabase
      .from("case_studies")
      .select("id, title, industry, description, status, published_at, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("導入事例の取得に失敗しました", error);
      setState((prev) => ({ ...prev, loading: false, error: "導入事例の取得に失敗しました" }));
      return;
    }

    const rows = (data ?? []) as any[];
    const items: CaseStudyTableItem[] = rows.map((item) => ({
      id: item.id,
      title: item.title,
      industry: item.industry,
      description: item.description,
      status: item.status ?? "draft",
      published_at: item.published_at,
      updated_at: item.updated_at,
    }));

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

  return <CaseStudyTable items={state.items} industries={state.industries} />;
}

export default function AdminCaseStudyListPage() {
  return (
    <AdminProtected>
      {({ supabase }) => <CaseStudyListContent supabase={supabase} />}
    </AdminProtected>
  );
}
