export type BlogPostStatus = "draft" | "scheduled" | "published" | "archived";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
  status: BlogPostStatus;
}
