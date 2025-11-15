import { notFound } from "next/navigation";

import { BlogEditor, type BlogEditorValues } from "@/components/admin/cms/BlogEditor";
import { createAdminServerClient } from "@/lib/auth";
import type { Database } from "@/types/supabase";

type BlogPostRow = Database["public"]["Tables"]["blog_posts"]["Row"];

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BlogEditorPageProps = {
  params: { id: BlogPostRow["id"] };
};

export default async function AdminBlogEditorPage({ params }: BlogEditorPageProps) {
  const { supabase } = await createAdminServerClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, title, slug, content, excerpt, category, cover_image_url, status, published_at"
    )
    .eq("id", params.id)
    .maybeSingle<BlogPostRow>();

  if (error) {
    console.error("ブログ記事の取得に失敗しました", error);
    return notFound();
  }

  if (!data) {
    return notFound();
  }

  const initialData: BlogEditorValues = {
    id: data.id,
    previousSlug: data.slug,
    title: data.title,
    slug: data.slug,
    content: data.content ?? "",
    excerpt: data.excerpt ?? "",
    category: data.category ?? "",
    cover_image_url: data.cover_image_url ?? "",
    status: data.status ?? "draft",
    published_at: data.published_at ?? ""
  };

  return <BlogEditor initialData={initialData} />;
}
