import { createClient } from "@/lib/supabaseClient";
import type { ManualPage } from "@/types/manual";

export async function getPublishedManualPages(): Promise<ManualPage[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("manuals")
    .select(
      "id, slug, title, section, body_markdown, order, status, published_at, created_at, updated_at"
    )
    .eq("status", "published")
    .order("section", { ascending: true })
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
    .from("manuals")
    .select(
      "id, slug, title, section, body_markdown, order, status, published_at, created_at, updated_at"
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
