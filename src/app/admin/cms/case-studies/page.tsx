import { notFound } from "next/navigation";

import { CaseStudyTable, type CaseStudyTableItem } from "@/components/admin/cms/CaseStudyTable";
import { createAdminServerClient } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminCaseStudyListPage() {
  const { supabase } = await createAdminServerClient();

  const { data, error } = await supabase
    .from("case_studies")
    .select("id, title, company_name, industry, status, published_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("導入事例の取得に失敗しました", error);
    return notFound();
  }

  const items: CaseStudyTableItem[] = (data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    company_name: item.company_name,
    industry: item.industry ?? "unknown",
    status: item.status ?? "draft",
    published_at: item.published_at,
    updated_at: item.updated_at
  }));

  const industries = Array.from(new Set(items.map((item) => item.industry))).sort();

  return <CaseStudyTable items={items} industries={industries} />;
}
