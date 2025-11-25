import { createClient } from "@/lib/supabaseClient";
import type { ManualPage } from "@/types/manual";
import type { Database } from "@/types/supabase";

function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

type CmsEntryRow = Pick<
  Database["public"]["Tables"]["cms_entries"]["Row"],
  "id" | "type" | "slug" | "title" | "body" | "status" | "published_at"
>;

function mapRowToManualPage(row: CmsEntryRow): ManualPage {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title ?? "",
    section: "general",
    body_markdown: row.body ?? null,
    order: 0,
    status: row.status === "published" ? "published" : "draft",
    published_at: row.published_at ?? null,
    created_at: null,
    updated_at: null,
  };
}

export async function getPublishedManualPages(): Promise<ManualPage[]> {
  if (!hasSupabaseEnv()) {
    console.warn("Supabase環境変数が未設定のため、マニュアルページの取得をスキップします。");
    return [];
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("cms_entries")
    .select("id, type, slug, title, body, status, published_at")
    .eq("type", "manual")
    .eq("status", "published")
    .order("published_at", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true });

  if (error) {
    console.error("Failed to fetch manual pages", error);
    return [];
  }

  const rows: CmsEntryRow[] = data ?? [];
  return rows.map(mapRowToManualPage);
}

export async function getManualPageBySlug(slug: string): Promise<ManualPage | null> {
  if (!hasSupabaseEnv()) {
    console.warn("Supabase環境変数が未設定のため、マニュアルページの取得をスキップします。");
    return null;
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("cms_entries")
    .select("id, type, slug, title, body, status, published_at")
    .eq("type", "manual")
    .eq("slug", slug.trim())
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch manual page", error);
    return null;
  }

  if (!data) return null;

  return mapRowToManualPage(data as CmsEntryRow);
}
