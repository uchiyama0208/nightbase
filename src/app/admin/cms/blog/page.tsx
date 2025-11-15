import { notFound } from "next/navigation";

import { BlogTable, type BlogTableItem } from "@/components/admin/cms/BlogTable";
import { createAdminServerClient } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminBlogListPage() {
  const { supabase } = await createAdminServerClient();
  const client = supabase as any;

  const { data, error } = await client
    .from("blog_posts")
    .select("id, title, slug, status, category, published_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("ブログ記事一覧の取得に失敗しました", error);
    return notFound();
  }

  const rows = (data ?? []) as any[];

  const items: BlogTableItem[] = rows.map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    status: item.status ?? "draft",
    category: item.category,
    published_at: item.published_at,
    updated_at: item.updated_at
  }));

  const categories = Array.from(
    new Set(
      items
        .map((item) => item.category)
        .filter((category): category is string => typeof category === "string" && category.length > 0)
    )
  ).sort();

  return <BlogTable items={items} categories={categories} />;
}
