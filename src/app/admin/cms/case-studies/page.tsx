import { notFound } from "next/navigation";

import { CaseStudyTable, type CaseStudyTableItem } from "@/components/admin/cms/CaseStudyTable";
import { createAdminServerClient } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminCaseStudyListPage() {
  const { supabase } = await createAdminServerClient();

  const { data, error } = await supabase
    .from("case_studies")
    .select("id, title, industry, description, status, published_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("導入事例の取得に失敗しました", error);
    return notFound();
  }

  const items: CaseStudyTableItem[] = (data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    industry: item.industry,
    description: item.description,
    status: item.status ?? "draft",
    published_at: item.published_at,
    updated_at: item.updated_at
  }));

  const industries = Array.from(new Set(items.map((item) => item.industry).filter(Boolean))) as string[];
  industries.sort();

  return <CaseStudyTable items={items} industries={industries} />;
}
