export type ManualStatus = "draft" | "published";

export type ManualPage = {
  id: string;
  slug: string;
  title: string;
  section: string;
  body_markdown: string | null;
  order: number;
  status: ManualStatus;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};
