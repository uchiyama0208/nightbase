import type { BlogPost } from "@/types/blog";
import type { Database } from "@/types/supabase";

import { createClient } from "./supabaseClient";

type CmsEntryRow = Pick<
  Database["public"]["Tables"]["cms_entries"]["Row"],
  "id" | "type" | "slug" | "title" | "body" | "excerpt" | "tags" | "cover_image_url" | "status" | "published_at"
>;

function mapRowToBlogPost(row: CmsEntryRow): BlogPost {
  const slug = (row.slug ?? "").trim();

  return {
    id: row.id,
    slug,
    title: row.title ?? "",
    content: row.body ?? "",
    excerpt: row.excerpt ?? null,
    cover_image_url: row.cover_image_url ?? null,
    tags: row.tags ?? [],
    published_at: row.published_at ?? null,
    created_at: null,
    updated_at: null,
    status: row.status === "published" ? "published" : "draft",
  };
}

const BLOG_POST_FIELDS =
  "id, type, slug, title, body, excerpt, cover_image_url, tags, published_at, status";

export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  const supabase = createClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("cms_entries")
    .select(BLOG_POST_FIELDS)
    .eq("type", "blog")
    .eq("status", "published")
    .or(`published_at.is.null,published_at.lte.${nowIso}`)
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("ブログ記事一覧の取得に失敗しました", error);
    throw new Error("ブログ記事一覧の取得に失敗しました");
  }

  const rows: CmsEntryRow[] = data ?? [];
  return rows
    .map(mapRowToBlogPost)
    .filter((post) => post.slug.length > 0 && post.status === "published");
}

export async function getPublishedBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  // 一覧と同じ取得条件で記事一覧を取り、その中から slug 一致のものを探す
  const posts = await getPublishedBlogPosts();

  const found = posts.find((post) => post.slug === normalizedSlug);

  return found ?? null;
}
