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
          tags: string[] | null;
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
          tags?: string[] | null;
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
          tags?: string[] | null;
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
          industry: string | null;
          summary: string | null;
          tags: string[] | null;
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
          industry?: string | null;
          summary?: string | null;
          tags?: string[] | null;
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
          industry?: string | null;
          summary?: string | null;
          tags?: string[] | null;
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
      cms_entries: {
        Row: {
          id: string;
          type: "blog" | "case_study" | "manual";
          slug: string;
          title: string;
          body: string | null;
          excerpt: string | null;
          tags: string[] | null;
          cover_image_url: string | null;
          status: "draft" | "published";
          published_at: string | null;
          created_at: string | null;
          updated_at: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          type: "blog" | "case_study" | "manual";
          slug: string;
          title: string;
          body?: string | null;
          excerpt?: string | null;
          tags?: string[] | null;
          cover_image_url?: string | null;
          status?: "draft" | "published";
          published_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          type?: "blog" | "case_study" | "manual";
          slug?: string;
          title?: string;
          body?: string | null;
          excerpt?: string | null;
          tags?: string[] | null;
          cover_image_url?: string | null;
          status?: "draft" | "published";
          published_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string | null;
          display_name_kana: string | null;
          role: string;
          avatar_url: string | null;
          phone_number: string | null;
          real_name: string | null;
          real_name_kana: string | null;
          store_id: string | null;
          guest_addressee: string | null;
          guest_receipt_type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email?: string | null;
          display_name?: string | null;
          display_name_kana?: string | null;
          role?: string;
          avatar_url?: string | null;
          phone_number?: string | null;
          real_name?: string | null;
          real_name_kana?: string | null;
          store_id?: string | null;
          guest_addressee?: string | null;
          guest_receipt_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string | null;
          display_name?: string | null;
          display_name_kana?: string | null;
          role?: string;
          avatar_url?: string | null;
          phone_number?: string | null;
          real_name?: string | null;
          real_name_kana?: string | null;
          store_id?: string | null;
          guest_addressee?: string | null;
          guest_receipt_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      attendance: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          status: "scheduled" | "working" | "finished" | "absent";
          start_time: string | null;
          end_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          status: "scheduled" | "working" | "finished" | "absent";
          start_time?: string | null;
          end_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          status?: "scheduled" | "working" | "finished" | "absent";
          start_time?: string | null;
          end_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      stores: {
        Row: {
          id: string;
          name: string;
          show_break_columns: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          show_break_columns?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          show_break_columns?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      time_cards: {
        Row: {
          id: string;
          user_id: string;
          work_date: string;
          clock_in: string | null;
          clock_out: string | null;
          break_start: string | null;
          break_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          work_date: string;
          clock_in?: string | null;
          clock_out?: string | null;
          break_start?: string | null;
          break_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          work_date?: string;
          clock_in?: string | null;
          clock_out?: string | null;
          break_start?: string | null;
          break_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_cards_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
        users: {
          Row: {
            id: string;
            email: string | null;
            created_at: string;
            updated_at: string;
          };
          Insert: {
            id: string;
            email?: string | null;
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: string;
            email?: string | null;
            created_at?: string;
            updated_at?: string;
          };
          Relationships: [
            {
              foreignKeyName: "users_id_fkey";
              columns: ["id"];
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
};
