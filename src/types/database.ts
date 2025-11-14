import type { BlogPost } from "./blog";
import type { CaseStudy } from "./case-studies";
import type { ManualPage } from "./manual";

type BlogPostRow = BlogPost;
type CaseStudyRow = CaseStudy;
type ManualPageRow = ManualPage;

export type Database = {
  public: {
    Tables: {
      blog_posts: {
        Row: BlogPostRow;
        Insert: Partial<BlogPostRow>;
        Update: Partial<BlogPostRow>;
        Relationships: [];
      };
      case_studies: {
        Row: CaseStudyRow;
        Insert: Partial<CaseStudyRow>;
        Update: Partial<CaseStudyRow>;
        Relationships: [];
      };
      manual_pages: {
        Row: ManualPageRow;
        Insert: Partial<ManualPageRow>;
        Update: Partial<ManualPageRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
