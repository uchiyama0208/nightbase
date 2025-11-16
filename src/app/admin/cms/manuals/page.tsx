"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { ManualTable, type ManualTableItem } from "@/components/admin/cms/ManualTable";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ManualListState = {
  loading: boolean;
  error: string | null;
  items: ManualTableItem[];
  sections: string[];
};

function ManualListContent({ supabase }: { supabase: any }) {
  const [state, setState] = useState<ManualListState>({
    loading: true,
    error: null,
    items: [],
    sections: [],
  });

  const loadManuals = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const { data, error } = await supabase
      .from("manuals")
      .select("id, title, slug, section, status, order, updated_at, published_at")
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

  return <ManualTable items={state.items} sections={state.sections} />;
}

export default function AdminManualListPage() {
  return (
    <AdminProtected>
      {({ supabase }) => <ManualListContent supabase={supabase} />}
    </AdminProtected>
  );
}
