import { notFound } from "next/navigation";

import { ManualEditor, type ManualEditorValues } from "@/components/admin/cms/ManualEditor";
import { createAdminServerClient } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ManualStatus = "draft" | "published";

type ManualEditorPageProps = {
  params: { id: string };
};

export default async function AdminManualEditorPage({ params }: ManualEditorPageProps) {
  const { supabase } = await createAdminServerClient();
  const client = supabase as any;

  const { data, error } = await client
    .from("manuals")
    .select("id, title, slug, section, body_markdown, order, status, published_at")
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
    section: data.section,
    body_markdown: data.body_markdown ?? "",
    order: data.order ?? 0,
    status,
    published_at: data.published_at ?? ""
  };

  return <ManualEditor initialData={initialData} />;
}
