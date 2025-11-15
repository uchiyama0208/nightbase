export type ManualStatus = "draft" | "published" | string;

export type ManualPage = {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string | null;
  body_markdown: string;
  order: number;
  status: ManualStatus;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};
