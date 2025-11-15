export type CaseStudyStatus = "draft" | "published" | "archived";

export interface CaseStudy {
  id: string;
  slug: string;
  title: string;
  company_name: string;
  industry: string;
  summary: string | null;
  problems: string | null;
  solutions: string | null;
  results: string | null;
  cover_image_url: string | null;
  status: CaseStudyStatus;
  published_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}
