import { notFound } from "next/navigation";

import { CaseStudyEditor, type CaseStudyEditorValues } from "@/components/admin/cms/CaseStudyEditor";
import { createAdminServerClient } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CaseStudyStatus = "draft" | "published";

type CaseStudyEditorPageProps = {
  params: { id: string };
};

export default async function AdminCaseStudyEditorPage({ params }: CaseStudyEditorPageProps) {
  const { supabase } = await createAdminServerClient();
  const client = supabase as any;

  const { data, error } = await client
    .from("case_studies")
    .select(
      "id, title, slug, industry, description, results, cover_image_url, status, published_at"
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

  const status: CaseStudyStatus = data.status === "published" ? "published" : "draft";

  const initialData: CaseStudyEditorValues = {
    id: data.id,
    previousSlug: data.slug,
    title: data.title,
    slug: data.slug,
    industry: data.industry ?? "cabaret",
    description: data.description ?? "",
    results: data.results ?? "",
    cover_image_url: data.cover_image_url ?? "",
    status,
    published_at: data.published_at ?? ""
  };

  return <CaseStudyEditor initialData={initialData} />;
}
