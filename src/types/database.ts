import type { BlogPost } from "./blog";
import type { CaseStudy } from "./case-studies";

type BlogPostRow = BlogPost;
type CaseStudyRow = CaseStudy;

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
