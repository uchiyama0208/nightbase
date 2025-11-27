import { createClient } from "@/lib/supabaseClient";
import type { CaseStudy, CaseStudyStatus } from "@/types/case-studies";
import type { Database } from "@/types/supabase";

function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

type CmsEntryRow = Pick<
  Database["public"]["Tables"]["cms_entries"]["Row"],
  "id" | "type" | "slug" | "title" | "body" | "excerpt" | "tags" | "cover_image_url" | "status" | "published_at"
>;

export const CASE_STUDY_FIELDS =
  "id, type, slug, title, body, excerpt, tags, cover_image_url, status, published_at";

// metadata を使わないシンプルな構成に移行したため、
// 以前の encode/decode ユーティリティは廃止しました。
// ただし、CaseStudyEditor.tsx でまだ使用されているため、互換性のために一時的に復元します。

export function encodeCaseStudyContent(data: {
  store_name: string | null;
  summary: string | null;
  problems: string | null;
  solutions: string | null;
  results: string | null;
}) {
  return data;
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
  if (!hasSupabaseEnv()) {
    console.warn("Supabase環境変数が未設定のため、導入事例一覧の取得をスキップします。");
    return [];
  }

  const supabase = createClient();
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("cms_entries")
    .select(CASE_STUDY_FIELDS)
    .eq("type", "case_study")
    .eq("status", "published")
    .or(`published_at.is.null,published_at.lte.${nowIso}`)
    .order("published_at", { ascending: false, nullsFirst: false });

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("導入事例一覧の取得に失敗しました", error);
    return [];
  }

  const rows: CmsEntryRow[] = data ?? [];

  return rows
    .map(normalizeCaseStudy)
    .filter((caseStudy) => caseStudy.slug.length > 0 && caseStudy.status === "published");
}

export async function getPublishedCaseStudyBySlug(slug: string): Promise<CaseStudy | null> {
  if (!hasSupabaseEnv()) {
    console.warn("Supabase環境変数が未設定のため、導入事例の取得をスキップします。");
    return null;
  }

  const supabase = createClient();
  const normalizedSlug = (slug ?? "").trim();

  if (!normalizedSlug) {
    return null;
  }

  const { data, error } = await supabase
    .from("cms_entries")
    .select(CASE_STUDY_FIELDS)
    .eq("type", "case_study")
    .eq("status", "published")
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (error) {
    console.error("導入事例の取得に失敗しました", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return normalizeCaseStudy(data as CmsEntryRow);
}

function normalizeCaseStudy(row: CmsEntryRow): CaseStudy {
  const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];

  // 業種はタグから推定
  // 1. 事前に定義したスラッグ（cabaret など）があればそれを優先
  // 2. なければ先頭のタグ文字列（例: 「キャバクラ」）をそのまま使う
  const slugLikeIndustry = tags.find((tag) => INDUSTRY_LABEL_MAP[tag]);
  const industryFromTags = slugLikeIndustry ?? tags[0] ?? null;

  const summaryFromExcerpt = (row as any).excerpt as string | null | undefined;
  const summaryFromBody = typeof row.body === "string" && row.body.trim().length > 0
    ? row.body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? null
    : null;

  const summary = summaryFromExcerpt ?? summaryFromBody ?? null;

  return {
    id: row.id,
    slug: (row.slug ?? "").trim(),
    title: row.title ?? "",
    body: row.body ?? null,
    store_name: null,
    tags,
    industry: industryFromTags,
    summary,
    problems: null,
    solutions: null,
    results: null,
    cover_image_url: row.cover_image_url ?? null,
    status: normalizeCaseStudyStatus(row.status),
    published_at: row.published_at ?? null,
    created_at: null,
    updated_at: null,
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
