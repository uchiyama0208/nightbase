import { createClient } from "@/lib/supabaseClient";
import type { CaseStudy } from "@/types/case-studies";

const CASE_STUDY_FIELDS =
  "id, slug, title, company_name, industry, summary, problems, solutions, results, cover_image_url, status, published_at, created_at, updated_at";

const INDUSTRY_LABEL_MAP: Record<string, string> = {
  cabaret: "キャバクラ",
  lounge: "ラウンジ",
  club: "クラブ",
  "girls-bar": "ガールズバー",
  "concept-cafe": "コンカフェ",
  host: "ホストクラブ",
  bar: "バー",
};

export function formatCaseStudyIndustry(industry: string): string {
  return INDUSTRY_LABEL_MAP[industry] ?? industry;
}

export async function getPublishedCaseStudies(limit?: number): Promise<CaseStudy[]> {
  const supabase = createClient();

  let query = supabase
    .from("case_studies")
    .select(CASE_STUDY_FIELDS)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false, nullsFirst: false });

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("導入事例一覧の取得に失敗しました", error);
    return [];
  }

  return data ?? [];
}

export async function getPublishedCaseStudyBySlug(slug: string): Promise<CaseStudy | null> {
  const supabase = createClient();
  const sanitizedSlug = slug.trim();

  const { data, error } = await supabase
    .from("case_studies")
    .select(CASE_STUDY_FIELDS)
    .eq("slug", sanitizedSlug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("導入事例の取得に失敗しました", error);
    return null;
  }

  return data ?? null;
}
