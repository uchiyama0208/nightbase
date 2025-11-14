import { createClient } from "@/lib/supabaseClient";
import type { ManualPage } from "@/types/manual";

export async function getPublishedManualPages(): Promise<ManualPage[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("manual_pages")
    .select(
      "id, slug, title, category, summary, body_markdown, order, status, published_at, created_at, updated_at"
    )
    .eq("status", "published")
    .order("category", { ascending: true })
    .order("order", { ascending: true });

  if (error) {
    console.error("Failed to fetch manual pages", error);
    return [];
  }

  return data ?? [];
}

export async function getManualPageBySlug(slug: string): Promise<ManualPage | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("manual_pages")
    .select(
      "id, slug, title, category, summary, body_markdown, order, status, published_at, created_at, updated_at"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch manual page", error);
    return null;
  }

  return data ?? null;
}
