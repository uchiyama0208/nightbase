import { createClient } from "@/lib/supabaseClient";
import type { CaseStudy, CaseStudyStatus } from "@/types/case-studies";

export const CASE_STUDY_FIELDS =
  "id, slug, title, store_name, industry, summary, cover_image_url, status, published_at, created_at, updated_at";

const CASE_STUDY_CONTENT_FLAG = "__nightbaseCaseStudy";
const CASE_STUDY_CONTENT_VERSION = 1;

export type CaseStudyContentFields = {
  summary: string | null;
  problems: string | null;
  solutions: string | null;
  results: string | null;
};

type CaseStudyContentPayload = CaseStudyContentFields & {
  [CASE_STUDY_CONTENT_FLAG]: true;
  version: number;
};

const EMPTY_CONTENT: CaseStudyContentFields = {
  summary: null,
  problems: null,
  solutions: null,
  results: null,
};

export function decodeCaseStudyContent(raw: string | null): CaseStudyContentFields {
  if (!raw) {
    return { ...EMPTY_CONTENT };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CaseStudyContentPayload>;
    if (parsed && parsed[CASE_STUDY_CONTENT_FLAG] && typeof parsed.version === "number") {
      return {
        summary: typeof parsed.summary === "string" ? parsed.summary : null,
        problems: typeof parsed.problems === "string" ? parsed.problems : null,
        solutions: typeof parsed.solutions === "string" ? parsed.solutions : null,
        results: typeof parsed.results === "string" ? parsed.results : null,
      };
    }
  } catch (error) {
    console.warn("[CaseStudies] JSON decode failed, treating summary as plain text", error);
  }

  return {
    summary: raw,
    problems: null,
    solutions: null,
    results: null,
  };
}

export function encodeCaseStudyContent(content: CaseStudyContentFields): string | null {
  const normalized: CaseStudyContentFields = {
    summary: content.summary?.trim() || null,
    problems: content.problems?.trim() || null,
    solutions: content.solutions?.trim() || null,
    results: content.results?.trim() || null,
  };

  const hasSections = Boolean(normalized.problems || normalized.solutions || normalized.results);

  if (!hasSections) {
    return normalized.summary;
  }

  const payload: CaseStudyContentPayload = {
    [CASE_STUDY_CONTENT_FLAG]: true,
    version: CASE_STUDY_CONTENT_VERSION,
    ...normalized,
  };

  return JSON.stringify(payload);
}

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
  store_name: string | null;
  industry: string | null;
  summary: string | null;
  cover_image_url: string | null;
  status: string;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}): CaseStudy {
  const parsedSummary = decodeCaseStudyContent(row.summary);

  return {
    ...row,
    summary: parsedSummary.summary,
    problems: parsedSummary.problems,
    solutions: parsedSummary.solutions,
    results: parsedSummary.results,
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
