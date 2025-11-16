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
          content: string | null;
          excerpt: string | null;
          category: string | null;
          cover_image_url: string | null;
          status: "draft" | "published";
          published_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          content?: string | null;
          excerpt?: string | null;
          category?: string | null;
          cover_image_url?: string | null;
          status?: "draft" | "published";
          published_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          content?: string | null;
          excerpt?: string | null;
          category?: string | null;
          cover_image_url?: string | null;
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
          company_name: string | null;
          industry: string | null;
          summary: string | null;
          problems: string | null;
          solutions: string | null;
          results: string | null;
          cover_image_url: string | null;
          status: "draft" | "published";
          published_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          company_name?: string | null;
          industry?: string | null;
          summary?: string | null;
          problems?: string | null;
          solutions?: string | null;
          results?: string | null;
          cover_image_url?: string | null;
          status?: "draft" | "published";
          published_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          company_name?: string | null;
          industry?: string | null;
          summary?: string | null;
          problems?: string | null;
          solutions?: string | null;
          results?: string | null;
          cover_image_url?: string | null;
          status?: "draft" | "published";
          published_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      manuals: {
        Row: {
          id: string;
          slug: string;
          title: string;
          section: string;
          body_markdown: string | null;
          order: number;
          status: "draft" | "published";
          published_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          section?: string;
          body_markdown?: string | null;
          order?: number;
          status?: "draft" | "published";
          published_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          section?: string;
          body_markdown?: string | null;
          order?: number;
          status?: "draft" | "published";
          published_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          email: string | null;
          display_name: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email?: string | null;
          display_name?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string | null;
          display_name?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
