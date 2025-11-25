export type CaseStudyStatus = "draft" | "published";

export interface CaseStudy {
  id: string;
  slug: string;
  title: string;
  body: string | null;
  summary: string | null;
  tags?: string[] | null;
  industry: string | null;
  cover_image_url: string | null;
  status: CaseStudyStatus;
  published_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  store_name?: string | null;
  problems?: string | null;
  solutions?: string | null;
  results?: string | null;
}
