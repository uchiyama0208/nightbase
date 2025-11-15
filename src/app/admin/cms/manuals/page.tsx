import { notFound } from "next/navigation";

import { ManualTable, type ManualTableItem } from "@/components/admin/cms/ManualTable";
import { createAdminServerClient } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminManualListPage() {
  const { supabase } = await createAdminServerClient();
  const client = supabase as any;

  const { data, error } = await client
    .from("manuals")
    .select("id, title, section, body_markdown, order, status, updated_at, published_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("マニュアル一覧の取得に失敗しました", error);
    return notFound();
  }

  const rows = (data ?? []) as any[];

  const items: ManualTableItem[] = rows.map((item) => ({
    id: item.id,
    title: item.title,
    section: item.section,
    body_markdown: item.body_markdown,
    order: item.order ?? 0,
    status: item.status ?? "draft",
    updated_at: item.updated_at,
    published_at: item.published_at
  }));

  const sections = Array.from(
    new Set(
      items
        .map((item) => item.section)
        .filter((section): section is string => typeof section === "string" && section.length > 0)
    )
  ).sort();

  return <ManualTable items={items} sections={sections} />;
}
