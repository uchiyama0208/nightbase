import type { BlogPost } from "@/types/blog";

import { createClient } from "./supabaseClient";

const BLOG_POST_FIELDS =
  "id, slug, title, content, excerpt, cover_image_url, category, published_at, updated_at, status";

export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_POST_FIELDS)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("ブログ記事一覧の取得に失敗しました", error);
    throw new Error("ブログ記事一覧の取得に失敗しました");
  }

  return data ?? [];
}

export async function getPublishedBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_POST_FIELDS)
    .eq("slug", normalizedSlug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("ブログ記事の取得に失敗しました", error);
    return null;
  }

  return data ?? null;
}
