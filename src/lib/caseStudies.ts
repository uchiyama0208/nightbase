import { createClient } from "@/lib/supabaseClient";
import type { CaseStudy, CaseStudyStatus } from "@/types/case-studies";

export const CASE_STUDY_FIELDS =
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

export function formatCaseStudyIndustry(industry: string | null): string {
  if (!industry) {
    return "その他";
  }

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

  return (data ?? []).map(normalizeCaseStudy);
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

  if (!data) {
    return null;
  }

  return normalizeCaseStudy(data);
}

function normalizeCaseStudy(row: {
  id: string;
  slug: string;
  title: string;
  company_name: string | null;
  industry: string | null;
  summary: string | null;
  problems: string | null;
  solutions: string | null;
  results: string | null;
  cover_image_url: string | null;
  status: string;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}): CaseStudy {
  return {
    ...row,
    status: normalizeCaseStudyStatus(row.status),
  };
}

function normalizeCaseStudyStatus(status: string | null | undefined): CaseStudyStatus {
  switch (status) {
    case "published":
      return "published";
    default:
      return "draft";
  }
}
