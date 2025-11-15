import { notFound } from "next/navigation";

import { ManualEditor, type ManualEditorValues } from "@/components/admin/cms/ManualEditor";
import { createAdminServerClient } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ManualEditorPageProps = {
  params: { id: string };
};

type ManualStatus = "draft" | "published";

export default async function AdminManualEditorPage({ params }: ManualEditorPageProps) {
  const { supabase } = await createAdminServerClient();

  const { data, error } = await supabase
    .from("manual_pages")
    .select("id, title, slug, category, summary, body_markdown, order, status, published_at")
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    console.error("マニュアルの取得に失敗しました", error);
    return notFound();
  }

  if (!data) {
    return notFound();
  }

  const status: ManualStatus = data.status === "published" ? "published" : "draft";

  const initialData: ManualEditorValues = {
    id: data.id,
    previousSlug: data.slug,
    title: data.title,
    slug: data.slug,
    category: data.category,
    summary: data.summary ?? "",
    body_markdown: data.body_markdown ?? "",
    order: data.order ?? 0,
    status,
    published_at: data.published_at ?? ""
  };

  return <ManualEditor initialData={initialData} />;
}
