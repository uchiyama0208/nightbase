import { notFound } from "next/navigation";

import { CaseStudyEditor, type CaseStudyEditorValues } from "@/components/admin/cms/CaseStudyEditor";
import { createAdminServerClient } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CaseStudyEditorPageProps = {
  params: { id: string };
};

export default async function AdminCaseStudyEditorPage({ params }: CaseStudyEditorPageProps) {
  const { supabase } = await createAdminServerClient();

  const { data, error } = await supabase
    .from("case_studies")
    .select(
      "id, title, slug, company_name, industry, summary, problems, solutions, results, cover_image_url, status, published_at"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    console.error("導入事例の取得に失敗しました", error);
    return notFound();
  }

  if (!data) {
    return notFound();
  }

  const initialData: CaseStudyEditorValues = {
    id: data.id,
    previousSlug: data.slug,
    title: data.title,
    slug: data.slug,
    company_name: data.company_name,
    industry: data.industry ?? "cabaret",
    summary: data.summary ?? "",
    problems: data.problems ?? "",
    solutions: data.solutions ?? "",
    results: data.results ?? "",
    cover_image_url: data.cover_image_url ?? "",
    status: data.status ?? "draft",
    published_at: data.published_at ?? ""
  };

  return <CaseStudyEditor initialData={initialData} />;
}
