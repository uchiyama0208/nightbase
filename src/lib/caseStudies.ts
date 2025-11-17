import { createClient } from "@/lib/supabaseClient";
import type { CaseStudy, CaseStudyStatus } from "@/types/case-studies";

export const CASE_STUDY_FIELDS =
  "id, slug, title, industry, summary, cover_image_url, status, published_at, created_at, updated_at";

const CASE_STUDY_CONTENT_FLAG = "__nightbaseCaseStudy";
const CASE_STUDY_CONTENT_VERSION = 1;

export type CaseStudyContentFields = {
  store_name: string | null;
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
  store_name: null,
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
        store_name: typeof parsed.store_name === "string" ? parsed.store_name : null,
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
    store_name: null,
    summary: raw,
    problems: null,
    solutions: null,
    results: null,
  };
}

export function encodeCaseStudyContent(content: CaseStudyContentFields): string | null {
  const normalized: CaseStudyContentFields = {
    store_name: content.store_name?.trim() || null,
    summary: content.summary?.trim() || null,
    problems: content.problems?.trim() || null,
    solutions: content.solutions?.trim() || null,
    results: content.results?.trim() || null,
  };

  const hasSections = Boolean(
    normalized.store_name || normalized.problems || normalized.solutions || normalized.results
  );

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
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("case_studies")
    .select(CASE_STUDY_FIELDS)
    .eq("status", "published")
    .or(`published_at.is.null,published_at.lte.${nowIso}`)
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

  return (data ?? [])
    .map(normalizeCaseStudy)
    .filter((caseStudy) => caseStudy.slug.length > 0);
}

export async function getPublishedCaseStudyBySlug(slug: string): Promise<CaseStudy | null> {
  const supabase = createClient();
  const nowIso = new Date().toISOString();

  const baseQuery = () =>
    supabase
      .from("case_studies")
      .select(CASE_STUDY_FIELDS)
      .eq("status", "published")
      .or(`published_at.is.null,published_at.lte.${nowIso}`);

  const slugCandidates = Array.from(
    new Set(
      [slug, slug?.trim()]
        .filter((value): value is string => Boolean(value && value.length > 0))
        .map((value) => value)
    )
  );

  for (const candidate of slugCandidates) {
    const slugQuery = await baseQuery().eq("slug", candidate).maybeSingle();

    if (slugQuery.error) {
      console.error("導入事例の取得に失敗しました", slugQuery.error);
      return null;
    }

    if (slugQuery.data) {
      return normalizeCaseStudy(slugQuery.data);
    }
  }

  const uuidPattern = /^[0-9a-fA-F-]{32,36}$/;
  const fallbackCandidate = slugCandidates[slugCandidates.length - 1] ?? slug;

  if (!fallbackCandidate || !uuidPattern.test(fallbackCandidate)) {
    return null;
  }

  const idQuery = await baseQuery().eq("id", fallbackCandidate).maybeSingle();

  if (idQuery.error) {
    console.error("導入事例の取得に失敗しました", idQuery.error);
    return null;
  }

  if (!idQuery.data) {
    return null;
  }

  return normalizeCaseStudy(idQuery.data);
}

function normalizeCaseStudy(row: {
  id: string;
  slug: string;
  title: string;
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
    slug: (row.slug ?? "").trim(),
    store_name: parsedSummary.store_name,
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
