export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      blog_posts: {
        Row: {
          id: string;
          slug: string;
          title: string;
          content: string;
          excerpt: string | null;
          cover_image_url: string | null;
          category: string | null;
          status: "draft" | "published";
          published_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          content: string;
          excerpt?: string | null;
          cover_image_url?: string | null;
          category?: string | null;
          status?: "draft" | "published";
          published_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          content?: string;
          excerpt?: string | null;
          cover_image_url?: string | null;
          category?: string | null;
          status?: "draft" | "published";
          published_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      case_studies: {
        Row: {
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
          status: "draft" | "published" | "archived" | string;
          published_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          company_name: string;
          industry: string;
          summary?: string | null;
          problems?: string | null;
          solutions?: string | null;
          results?: string | null;
          cover_image_url?: string | null;
          status?: "draft" | "published" | "archived" | string;
          published_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          company_name?: string;
          industry?: string;
          summary?: string | null;
          problems?: string | null;
          solutions?: string | null;
          results?: string | null;
          cover_image_url?: string | null;
          status?: "draft" | "published" | "archived" | string;
          published_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      manual_pages: {
        Row: {
          id: string;
          slug: string;
          title: string;
          category: string;
          summary: string | null;
          body_markdown: string;
          order: number;
          status: "draft" | "published" | string;
          published_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          category: string;
          summary?: string | null;
          body_markdown: string;
          order?: number;
          status?: "draft" | "published" | string;
          published_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          category?: string;
          summary?: string | null;
          body_markdown?: string;
          order?: number;
          status?: "draft" | "published" | string;
          published_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
