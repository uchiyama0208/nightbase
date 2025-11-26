export type BlogPostStatus = "draft" | "published";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[];
  category?: string | null;
  published_at: string | null;
  created_at?: string | null;
  updated_at: string | null;
  status: BlogPostStatus;
}

export interface BlogPostInput {
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[];
  category?: string | null;
  status: BlogPostStatus;
  published_at: string | null;
}
