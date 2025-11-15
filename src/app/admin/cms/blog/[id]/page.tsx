import { notFound } from "next/navigation";

import { BlogEditor, type BlogEditorValues } from "@/components/admin/cms/BlogEditor";
import { createAdminServerClient } from "@/lib/auth";
import type { BlogPost } from "@/types/blog";
import type { Database } from "@/types/supabase";

type BlogPostRow = Database["public"]["Tables"]["blog_posts"]["Row"];

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BlogEditorPageProps = {
  params: { id: string };
};

export default async function AdminBlogEditorPage({ params }: BlogEditorPageProps) {
  const { supabase } = await createAdminServerClient();

  const { data, error } = await supabase
    .from<BlogPostRow>("blog_posts")
    .select(
      "id, title, slug, content, excerpt, category, cover_image_url, status, published_at"
    )
    .eq("id", params.id as BlogPostRow["id"])
    .maybeSingle();

  if (error) {
    console.error("ブログ記事の取得に失敗しました", error);
    return notFound();
  }

  const post = (data ?? null) as BlogPost | null;

  if (!post) {
    return notFound();
  }

  const initialData: BlogEditorValues = {
    id: post.id,
    previousSlug: post.slug,
    title: post.title,
    slug: post.slug,
    content: post.content ?? "",
    excerpt: post.excerpt ?? "",
    category: post.category ?? "",
    cover_image_url: post.cover_image_url ?? "",
    status: post.status ?? "draft",
    published_at: post.published_at ?? ""
  };

  return <BlogEditor initialData={initialData} />;
}
