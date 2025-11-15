import { notFound } from "next/navigation";

import { ManualTable, type ManualTableItem } from "@/components/admin/cms/ManualTable";
import { createAdminServerClient } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminManualListPage() {
  const { supabase } = await createAdminServerClient();

  const { data, error } = await supabase
    .from("manual_pages")
    .select("id, title, category, summary, order, status, updated_at, published_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("マニュアル一覧の取得に失敗しました", error);
    return notFound();
  }

  const items: ManualTableItem[] = (data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    summary: item.summary,
    order: item.order ?? 0,
    status: item.status ?? "draft",
    updated_at: item.updated_at,
    published_at: item.published_at
  }));

  const categories = Array.from(new Set(items.map((item) => item.category))).sort();

  return <ManualTable items={items} categories={categories} />;
}
