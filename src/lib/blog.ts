import type { BlogPost } from "@/types/blog";
import type { Database } from "@/types/supabase";

import { createClient } from "./supabaseClient";

type BlogPostRow = Database["public"]["Tables"]["blog_posts"]["Row"];

function escapeLikePattern(value: string) {
  return value.replace(/[%_]/g, "\\$&");
}

function mapRowToBlogPost(row: BlogPostRow): BlogPost {
  const slug = (row.slug ?? "").trim();

  return {
    id: row.id,
    slug,
    title: row.title ?? "",
    content: row.content ?? "",
    excerpt: row.excerpt ?? null,
    cover_image_url: row.cover_image_url ?? null,
    category: row.category ?? null,
    published_at: row.published_at ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    status: row.status === "published" ? "published" : "draft",
  };
}

const BLOG_POST_FIELDS =
  "id, slug, title, content, excerpt, cover_image_url, category, published_at, created_at, updated_at, status";

export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  const supabase = createClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_POST_FIELDS)
    .eq("status", "published")
    .or(`published_at.is.null,published_at.lte.${nowIso}`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("ブログ記事一覧の取得に失敗しました", error);
    throw new Error("ブログ記事一覧の取得に失敗しました");
  }

  const rows: BlogPostRow[] = data ?? [];
  return rows
    .map(mapRowToBlogPost)
    .filter((post) => post.slug.length > 0 && post.status === "published");
}

export async function getPublishedBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  const supabase = createClient();
  const nowIso = new Date().toISOString();

  const slugPattern = escapeLikePattern(normalizedSlug);

  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_POST_FIELDS)
    .eq("status", "published")
    .or(`published_at.is.null,published_at.lte.${nowIso}`)
    .ilike("slug", slugPattern)
    .maybeSingle();

  if (error) {
    console.error("ブログ記事の取得に失敗しました", error);
    return null;
  }

  return data ? mapRowToBlogPost(data as BlogPostRow) : null;
}
