export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          profile_id: string
          role: string
          store_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          profile_id: string
          role: string
          store_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          profile_id?: string
          role?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_messages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_settings: {
        Row: {
          created_at: string
          extension_fee_30m: number
          extension_fee_60m: number
          hourly_charge: number
          jounai_fee: number
          service_rate: number
          set_duration_minutes: number
          shime_fee: number
          store_id: string
          tax_rate: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          extension_fee_30m?: number
          extension_fee_60m?: number
          hourly_charge?: number
          jounai_fee?: number
          service_rate?: number
          set_duration_minutes?: number
          shime_fee?: number
          store_id: string
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          extension_fee_30m?: number
          extension_fee_60m?: number
          hourly_charge?: number
          jounai_fee?: number
          service_rate?: number
          set_duration_minutes?: number
          shime_fee?: number
          store_id?: string
          tax_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      bottle_keep_holders: {
        Row: {
          bottle_keep_id: string
          created_at: string
          id: string
          profile_id: string
        }
        Insert: {
          bottle_keep_id: string
          created_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          bottle_keep_id?: string
          created_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bottle_keep_holders_bottle_keep_id_fkey"
            columns: ["bottle_keep_id"]
            isOneToOne: false
            referencedRelation: "bottle_keeps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bottle_keep_holders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bottle_keeps: {
        Row: {
          created_at: string
          expiration_date: string | null
          id: string
          menu_id: string
          opened_at: string
          remaining_amount: number
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expiration_date?: string | null
          id?: string
          menu_id: string
          opened_at?: string
          remaining_amount?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expiration_date?: string | null
          id?: string
          menu_id?: string
          opened_at?: string
          remaining_amount?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bottle_keeps_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bottle_keeps_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_entries: {
        Row: {
          body: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          metadata: Json | null
          published_at: string | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          metadata?: Json | null
          published_at?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          metadata?: Json | null
          published_at?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          profile_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          profile_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_comment_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_profile_id: string
          content: string
          created_at: string | null
          id: string
          store_id: string
          target_bottle_keep_id: string | null
          target_profile_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_profile_id: string
          content: string
          created_at?: string | null
          id?: string
          store_id: string
          target_bottle_keep_id?: string | null
          target_profile_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_profile_id?: string
          content?: string
          created_at?: string | null
          id?: string
          store_id?: string
          target_bottle_keep_id?: string | null
          target_profile_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_comments_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_comments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_comments_target_bottle_keep_id_fkey"
            columns: ["target_bottle_keep_id"]
            isOneToOne: false
            referencedRelation: "bottle_keeps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_comments_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_likes: {
        Row: {
          created_at: string
          id: string
          manual_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manual_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manual_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_likes_manual_id_fkey"
            columns: ["manual_id"]
            isOneToOne: false
            referencedRelation: "store_manuals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_reads: {
        Row: {
          id: string
          manual_id: string
          profile_id: string
          read_at: string
        }
        Insert: {
          id?: string
          manual_id: string
          profile_id: string
          read_at?: string
        }
        Update: {
          id?: string
          manual_id?: string
          profile_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_reads_manual_id_fkey"
            columns: ["manual_id"]
            isOneToOne: false
            referencedRelation: "store_manuals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_reads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_tags: {
        Row: {
          created_at: string | null
          id: string
          name: string
          store_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          store_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_tags_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number | null
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number | null
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          cast_back_amount: number | null
          category_id: string
          created_at: string
          hide_from_slip: boolean | null
          id: string
          image_url: string | null
          name: string
          price: number
          store_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          cast_back_amount?: number | null
          category_id: string
          created_at?: string
          hide_from_slip?: boolean | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          store_id: string
          target_type?: string
          updated_at?: string
        }
        Update: {
          cast_back_amount?: number | null
          category_id?: string
          created_at?: string
          hide_from_slip?: boolean | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          store_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menus_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          cast_id: string | null
          cast_status: string | null
          created_at: string
          created_by: string | null
          end_time: string | null
          guest_id: string | null
          id: string
          item_name: string | null
          menu_id: string | null
          quantity: number
          start_time: string | null
          status: string
          table_session_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          cast_id?: string | null
          cast_status?: string | null
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          guest_id?: string | null
          id?: string
          item_name?: string | null
          menu_id?: string | null
          quantity?: number
          start_time?: string | null
          status?: string
          table_session_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cast_id?: string | null
          cast_status?: string | null
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          guest_id?: string | null
          id?: string
          item_name?: string | null
          menu_id?: string | null
          quantity?: number
          start_time?: string | null
          status?: string
          table_session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_cast_id_fkey"
            columns: ["cast_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_session_id_fkey"
            columns: ["table_session_id"]
            isOneToOne: false
            referencedRelation: "table_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      past_employments: {
        Row: {
          created_at: string | null
          customer_count: number | null
          hourly_wage: number | null
          id: string
          period: string | null
          profile_id: string
          sales_amount: number | null
          store_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_count?: number | null
          hourly_wage?: number | null
          id?: string
          period?: string | null
          profile_id: string
          sales_amount?: number | null
          store_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_count?: number | null
          hourly_wage?: number | null
          id?: string
          period?: string | null
          profile_id?: string
          sales_amount?: number | null
          store_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "past_employments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_passengers: {
        Row: {
          cast_profile_id: string
          created_at: string | null
          id: string
          order_index: number
          route_id: string
          trip_number: number
        }
        Insert: {
          cast_profile_id: string
          created_at?: string | null
          id?: string
          order_index?: number
          route_id: string
          trip_number?: number
        }
        Update: {
          cast_profile_id?: string
          created_at?: string | null
          id?: string
          order_index?: number
          route_id?: string
          trip_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "pickup_passengers_cast_profile_id_fkey"
            columns: ["cast_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_passengers_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "pickup_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_routes: {
        Row: {
          capacity: number
          created_at: string | null
          date: string
          driver_profile_id: string | null
          id: string
          round_trips: number
          store_id: string
          updated_at: string | null
        }
        Insert: {
          capacity?: number
          created_at?: string | null
          date: string
          driver_profile_id?: string | null
          id?: string
          round_trips?: number
          store_id: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string | null
          date?: string
          driver_profile_id?: string | null
          id?: string
          round_trips?: number
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pickup_routes_driver_profile_id_fkey"
            columns: ["driver_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_routes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "store_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reads: {
        Row: {
          id: string
          post_id: string
          profile_id: string
          read_at: string
        }
        Insert: {
          id?: string
          post_id: string
          profile_id: string
          read_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          profile_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reads_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "store_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_systems: {
        Row: {
          companion_fee: number
          companion_set_duration_minutes: number | null
          created_at: string
          douhan_fee: number
          douhan_set_duration_minutes: number
          extension_duration_minutes: number
          extension_fee: number
          id: string
          is_default: boolean
          name: string
          nomination_fee: number
          nomination_set_duration_minutes: number | null
          service_rate: number
          set_duration_minutes: number
          set_fee: number
          store_id: string
          tax_rate: number
          updated_at: string
        }
        Insert: {
          companion_fee?: number
          companion_set_duration_minutes?: number | null
          created_at?: string
          douhan_fee?: number
          douhan_set_duration_minutes?: number
          extension_duration_minutes?: number
          extension_fee?: number
          id?: string
          is_default?: boolean
          name: string
          nomination_fee?: number
          nomination_set_duration_minutes?: number | null
          service_rate?: number
          set_duration_minutes?: number
          set_fee?: number
          store_id: string
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          companion_fee?: number
          companion_set_duration_minutes?: number | null
          created_at?: string
          douhan_fee?: number
          douhan_set_duration_minutes?: number
          extension_duration_minutes?: number
          extension_fee?: number
          id?: string
          is_default?: boolean
          name?: string
          nomination_fee?: number
          nomination_set_duration_minutes?: number | null
          service_rate?: number
          set_duration_minutes?: number
          set_fee?: number
          store_id?: string
          tax_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_systems_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_relationships: {
        Row: {
          created_at: string | null
          id: string
          relationship_type: string
          source_profile_id: string
          store_id: string
          target_profile_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          relationship_type: string
          source_profile_id: string
          store_id: string
          target_profile_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          relationship_type?: string
          source_profile_id?: string
          store_id?: string
          target_profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_relationships_source_profile_id_fkey"
            columns: ["source_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_relationships_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_relationships_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_salary_systems: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string
          salary_system_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id: string
          salary_system_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string
          salary_system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_salary_systems_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_salary_systems_salary_system_id_fkey"
            columns: ["salary_system_id"]
            isOneToOne: false
            referencedRelation: "salary_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: string | null
          avatar_url: string | null
          building: string | null
          city: string | null
          created_at: string
          desired_cast_name: string | null
          desired_hourly_wage: number | null
          desired_shift_days: string | null
          display_name: string | null
          display_name_kana: string | null
          emergency_phone_number: string | null
          first_name: string | null
          first_name_kana: string | null
          guest_addressee: string | null
          guest_receipt_type: string | null
          height: number | null
          id: string
          invite_expires_at: string | null
          invite_password_hash: string | null
          invite_status: string | null
          invite_token: string | null
          is_temporary: boolean | null
          last_name: string | null
          last_name_kana: string | null
          line_is_friend: boolean | null
          line_user_id: string | null
          nearest_station: string | null
          phone_number: string | null
          prefecture: string | null
          real_name: string | null
          real_name_kana: string | null
          role: string
          role_id: string | null
          status: Database["public"]["Enums"]["profile_status"] | null
          store_id: string | null
          street: string | null
          theme: string | null
          updated_at: string
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          approval_status?: string | null
          avatar_url?: string | null
          building?: string | null
          city?: string | null
          created_at?: string
          desired_cast_name?: string | null
          desired_hourly_wage?: number | null
          desired_shift_days?: string | null
          display_name?: string | null
          display_name_kana?: string | null
          emergency_phone_number?: string | null
          first_name?: string | null
          first_name_kana?: string | null
          guest_addressee?: string | null
          guest_receipt_type?: string | null
          height?: number | null
          id?: string
          invite_expires_at?: string | null
          invite_password_hash?: string | null
          invite_status?: string | null
          invite_token?: string | null
          is_temporary?: boolean | null
          last_name?: string | null
          last_name_kana?: string | null
          line_is_friend?: boolean | null
          line_user_id?: string | null
          nearest_station?: string | null
          phone_number?: string | null
          prefecture?: string | null
          real_name?: string | null
          real_name_kana?: string | null
          role?: string
          role_id?: string | null
          status?: Database["public"]["Enums"]["profile_status"] | null
          store_id?: string | null
          street?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          approval_status?: string | null
          avatar_url?: string | null
          building?: string | null
          city?: string | null
          created_at?: string
          desired_cast_name?: string | null
          desired_hourly_wage?: number | null
          desired_shift_days?: string | null
          display_name?: string | null
          display_name_kana?: string | null
          emergency_phone_number?: string | null
          first_name?: string | null
          first_name_kana?: string | null
          guest_addressee?: string | null
          guest_receipt_type?: string | null
          height?: number | null
          id?: string
          invite_expires_at?: string | null
          invite_password_hash?: string | null
          invite_status?: string | null
          invite_token?: string | null
          is_temporary?: boolean | null
          last_name?: string | null
          last_name_kana?: string | null
          line_is_friend?: boolean | null
          line_user_id?: string | null
          nearest_station?: string | null
          phone_number?: string | null
          prefecture?: string | null
          real_name?: string | null
          real_name_kana?: string | null
          role?: string
          role_id?: string | null
          status?: Database["public"]["Enums"]["profile_status"] | null
          store_id?: string | null
          street?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "store_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_systems: {
        Row: {
          created_at: string | null
          deductions: Json | null
          douhan_back_settings: Json | null
          hourly_settings: Json | null
          id: string
          jounai_back_settings: Json | null
          name: string
          shared_count_type: string | null
          shimei_back_settings: Json | null
          store_back_settings: Json | null
          store_id: string
          target_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deductions?: Json | null
          douhan_back_settings?: Json | null
          hourly_settings?: Json | null
          id?: string
          jounai_back_settings?: Json | null
          name: string
          shared_count_type?: string | null
          shimei_back_settings?: Json | null
          store_back_settings?: Json | null
          store_id: string
          target_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deductions?: Json | null
          douhan_back_settings?: Json | null
          hourly_settings?: Json | null
          id?: string
          jounai_back_settings?: Json | null
          name?: string
          shared_count_type?: string | null
          shimei_back_settings?: Json | null
          store_back_settings?: Json | null
          store_id?: string
          target_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_systems_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      session_guests: {
        Row: {
          created_at: string
          guest_id: string
          id: string
          table_session_id: string
        }
        Insert: {
          created_at?: string
          guest_id: string
          id?: string
          table_session_id: string
        }
        Update: {
          created_at?: string
          guest_id?: string
          id?: string
          table_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_guests_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_guests_table_session_id_fkey"
            columns: ["table_session_id"]
            isOneToOne: false
            referencedRelation: "table_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_automation_settings: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          period_type: string | null
          reminder_day_offset: number | null
          reminder_enabled: boolean | null
          reminder_hour: number | null
          send_day_offset: number | null
          send_hour: number | null
          store_id: string
          target_roles: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          period_type?: string | null
          reminder_day_offset?: number | null
          reminder_enabled?: boolean | null
          reminder_hour?: number | null
          send_day_offset?: number | null
          send_hour?: number | null
          store_id: string
          target_roles?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          period_type?: string | null
          reminder_day_offset?: number | null
          reminder_enabled?: boolean | null
          reminder_hour?: number | null
          send_day_offset?: number | null
          send_hour?: number | null
          store_id?: string
          target_roles?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_automation_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_request_dates: {
        Row: {
          created_at: string | null
          default_end_time: string | null
          default_start_time: string | null
          id: string
          shift_request_id: string
          target_date: string
        }
        Insert: {
          created_at?: string | null
          default_end_time?: string | null
          default_start_time?: string | null
          id?: string
          shift_request_id: string
          target_date: string
        }
        Update: {
          created_at?: string | null
          default_end_time?: string | null
          default_start_time?: string | null
          id?: string
          shift_request_id?: string
          target_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_request_dates_shift_request_id_fkey"
            columns: ["shift_request_id"]
            isOneToOne: false
            referencedRelation: "shift_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_requests: {
        Row: {
          created_at: string | null
          created_by: string | null
          deadline: string
          description: string | null
          id: string
          line_notification_sent: boolean | null
          status: string
          store_id: string
          target_profile_ids: string[] | null
          target_roles: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deadline: string
          description?: string | null
          id?: string
          line_notification_sent?: boolean | null
          status?: string
          store_id: string
          target_profile_ids?: string[] | null
          target_roles?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deadline?: string
          description?: string | null
          id?: string
          line_notification_sent?: boolean | null
          status?: string
          store_id?: string
          target_profile_ids?: string[] | null
          target_roles?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_submissions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_end_time: string | null
          approved_start_time: string | null
          availability: string
          created_at: string | null
          id: string
          note: string | null
          preferred_end_time: string | null
          preferred_start_time: string | null
          profile_id: string
          shift_request_date_id: string
          shift_request_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_end_time?: string | null
          approved_start_time?: string | null
          availability: string
          created_at?: string | null
          id?: string
          note?: string | null
          preferred_end_time?: string | null
          preferred_start_time?: string | null
          profile_id: string
          shift_request_date_id: string
          shift_request_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_end_time?: string | null
          approved_start_time?: string | null
          availability?: string
          created_at?: string | null
          id?: string
          note?: string | null
          preferred_end_time?: string | null
          preferred_start_time?: string | null
          profile_id?: string
          shift_request_date_id?: string
          shift_request_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_submissions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_submissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_submissions_shift_request_date_id_fkey"
            columns: ["shift_request_date_id"]
            isOneToOne: false
            referencedRelation: "shift_request_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_submissions_shift_request_id_fkey"
            columns: ["shift_request_id"]
            isOneToOne: false
            referencedRelation: "shift_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      sns_accounts: {
        Row: {
          access_token: string | null
          account_id: string | null
          account_name: string | null
          created_at: string | null
          id: string
          is_connected: boolean | null
          platform: string
          refresh_token: string | null
          store_id: string
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          platform: string
          refresh_token?: string | null
          store_id: string
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          platform?: string
          refresh_token?: string | null
          store_id?: string
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sns_accounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sns_recurring_schedules: {
        Row: {
          content_type: string
          created_at: string | null
          created_by: string | null
          id: string
          image_style: string | null
          instagram_type: string | null
          is_active: boolean | null
          last_run_at: string | null
          name: string
          platforms: string[]
          schedule_hour: number
          store_id: string
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          content_type: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_style?: string | null
          instagram_type?: string | null
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          platforms: string[]
          schedule_hour: number
          store_id: string
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_style?: string | null
          instagram_type?: string | null
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          platforms?: string[]
          schedule_hour?: number
          store_id?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sns_recurring_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sns_recurring_schedules_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sns_recurring_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "sns_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sns_scheduled_posts: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          image_style: string | null
          image_url: string | null
          instagram_type: string | null
          platforms: string[]
          scheduled_at: string
          status: string | null
          store_id: string
          template_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          image_style?: string | null
          image_url?: string | null
          instagram_type?: string | null
          platforms: string[]
          scheduled_at: string
          status?: string | null
          store_id: string
          template_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          image_style?: string | null
          image_url?: string | null
          instagram_type?: string | null
          platforms?: string[]
          scheduled_at?: string
          status?: string | null
          store_id?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sns_scheduled_posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sns_scheduled_posts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sns_scheduled_posts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "sns_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sns_templates: {
        Row: {
          content: string
          created_at: string | null
          id: string
          image_style: string | null
          name: string
          store_id: string
          template_type: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          image_style?: string | null
          name: string
          store_id: string
          template_type: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          image_style?: string | null
          name?: string
          store_id?: string
          template_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sns_templates_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_manual_tags: {
        Row: {
          manual_id: string
          tag_id: string
        }
        Insert: {
          manual_id: string
          tag_id: string
        }
        Update: {
          manual_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_manual_tags_manual_id_fkey"
            columns: ["manual_id"]
            isOneToOne: false
            referencedRelation: "store_manuals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_manual_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "manual_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      store_manuals: {
        Row: {
          content: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          status: string | null
          store_id: string
          title: string
          updated_at: string | null
          visibility: string[] | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          status?: string | null
          store_id: string
          title: string
          updated_at?: string | null
          visibility?: string[] | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          status?: string | null
          store_id?: string
          title?: string
          updated_at?: string | null
          visibility?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "store_manuals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_manuals_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_posts: {
        Row: {
          content: Json | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          status: string
          store_id: string
          title: string
          type: string
          updated_at: string
          visibility: string[] | null
        }
        Insert: {
          content?: Json | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          status?: string
          store_id: string
          title: string
          type: string
          updated_at?: string
          visibility?: string[] | null
        }
        Update: {
          content?: Json | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          status?: string
          store_id?: string
          title?: string
          type?: string
          updated_at?: string
          visibility?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "store_posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_posts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_roles: {
        Row: {
          created_at: string
          id: string
          is_system_role: boolean | null
          name: string
          permissions: Json
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system_role?: boolean | null
          name: string
          permissions?: Json
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system_role?: boolean | null
          name?: string
          permissions?: Json
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_roles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          allow_join_by_code: boolean | null
          allow_join_by_url: boolean | null
          allow_join_requests: boolean | null
          auto_clockout_enabled: boolean | null
          business_end_time: string | null
          business_start_time: string | null
          city: string | null
          closed_days: string[] | null
          created_at: string
          day_switch_time: string | null
          default_cast_end_time: string | null
          default_cast_start_time: string | null
          default_staff_end_time: string | null
          default_staff_start_time: string | null
          icon_url: string | null
          id: string
          industry: string | null
          latitude: number | null
          location_check_enabled: boolean | null
          location_radius: number | null
          longitude: number | null
          name: string
          postal_code: string | null
          prefecture: string | null
          referral_source: string | null
          rotation_time: number | null
          show_attendance: boolean
          show_break_columns: boolean | null
          show_dashboard: boolean
          show_menus: boolean | null
          show_roles: boolean
          show_shifts: boolean | null
          show_timecard: boolean
          show_users: boolean
          slip_rounding_enabled: boolean | null
          slip_rounding_method: string | null
          slip_rounding_unit: number | null
          tablet_acceptance_end_time: string | null
          tablet_acceptance_start_time: string | null
          tablet_allowed_roles: string[] | null
          tablet_theme: string | null
          tablet_timecard_enabled: boolean
          time_rounding_enabled: boolean | null
          time_rounding_method: string | null
          time_rounding_minutes: number | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          allow_join_by_code?: boolean | null
          allow_join_by_url?: boolean | null
          allow_join_requests?: boolean | null
          auto_clockout_enabled?: boolean | null
          business_end_time?: string | null
          business_start_time?: string | null
          city?: string | null
          closed_days?: string[] | null
          created_at?: string
          day_switch_time?: string | null
          default_cast_end_time?: string | null
          default_cast_start_time?: string | null
          default_staff_end_time?: string | null
          default_staff_start_time?: string | null
          icon_url?: string | null
          id?: string
          industry?: string | null
          latitude?: number | null
          location_check_enabled?: boolean | null
          location_radius?: number | null
          longitude?: number | null
          name: string
          postal_code?: string | null
          prefecture?: string | null
          referral_source?: string | null
          rotation_time?: number | null
          show_attendance?: boolean
          show_break_columns?: boolean | null
          show_dashboard?: boolean
          show_menus?: boolean | null
          show_roles?: boolean
          show_shifts?: boolean | null
          show_timecard?: boolean
          show_users?: boolean
          slip_rounding_enabled?: boolean | null
          slip_rounding_method?: string | null
          slip_rounding_unit?: number | null
          tablet_acceptance_end_time?: string | null
          tablet_acceptance_start_time?: string | null
          tablet_allowed_roles?: string[] | null
          tablet_theme?: string | null
          tablet_timecard_enabled?: boolean
          time_rounding_enabled?: boolean | null
          time_rounding_method?: string | null
          time_rounding_minutes?: number | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          allow_join_by_code?: boolean | null
          allow_join_by_url?: boolean | null
          allow_join_requests?: boolean | null
          auto_clockout_enabled?: boolean | null
          business_end_time?: string | null
          business_start_time?: string | null
          city?: string | null
          closed_days?: string[] | null
          created_at?: string
          day_switch_time?: string | null
          default_cast_end_time?: string | null
          default_cast_start_time?: string | null
          default_staff_end_time?: string | null
          default_staff_start_time?: string | null
          icon_url?: string | null
          id?: string
          industry?: string | null
          latitude?: number | null
          location_check_enabled?: boolean | null
          location_radius?: number | null
          longitude?: number | null
          name?: string
          postal_code?: string | null
          prefecture?: string | null
          referral_source?: string | null
          rotation_time?: number | null
          show_attendance?: boolean
          show_break_columns?: boolean | null
          show_dashboard?: boolean
          show_menus?: boolean | null
          show_roles?: boolean
          show_shifts?: boolean | null
          show_timecard?: boolean
          show_users?: boolean
          slip_rounding_enabled?: boolean | null
          slip_rounding_method?: string | null
          slip_rounding_unit?: number | null
          tablet_acceptance_end_time?: string | null
          tablet_acceptance_start_time?: string | null
          tablet_allowed_roles?: string[] | null
          tablet_theme?: string | null
          tablet_timecard_enabled?: boolean
          time_rounding_enabled?: boolean | null
          time_rounding_method?: string | null
          time_rounding_minutes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      table_sessions: {
        Row: {
          created_at: string
          end_time: string | null
          guest_count: number
          id: string
          main_guest_id: string | null
          pricing_system_id: string | null
          start_time: string
          status: string
          store_id: string
          table_id: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          guest_count?: number
          id?: string
          main_guest_id?: string | null
          pricing_system_id?: string | null
          start_time?: string
          status?: string
          store_id: string
          table_id?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          guest_count?: number
          id?: string
          main_guest_id?: string | null
          pricing_system_id?: string | null
          start_time?: string
          status?: string
          store_id?: string
          table_id?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_sessions_main_guest_id_fkey"
            columns: ["main_guest_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_pricing_system_id_fkey"
            columns: ["pricing_system_id"]
            isOneToOne: false
            referencedRelation: "pricing_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      table_types: {
        Row: {
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "table_types_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          created_at: string
          height: number
          id: string
          layout_data: Json | null
          name: string
          rotation: number | null
          shape: string
          store_id: string
          type_id: string | null
          updated_at: string
          width: number
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          height?: number
          id?: string
          layout_data?: Json | null
          name: string
          rotation?: number | null
          shape?: string
          store_id: string
          type_id?: string | null
          updated_at?: string
          width?: number
          x?: number
          y?: number
        }
        Update: {
          created_at?: string
          height?: number
          id?: string
          layout_data?: Json | null
          name?: string
          rotation?: number | null
          shape?: string
          store_id?: string
          type_id?: string | null
          updated_at?: string
          width?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "tables_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "table_types"
            referencedColumns: ["id"]
          },
        ]
      }
      time_cards: {
        Row: {
          break_end: string | null
          break_start: string | null
          clock_in: string | null
          clock_out: string | null
          created_at: string
          forgot_clockout: boolean | null
          id: string
          pickup_destination: string | null
          pickup_required: boolean | null
          scheduled_end_time: string | null
          scheduled_start_time: string | null
          updated_at: string
          user_id: string
          work_date: string
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          forgot_clockout?: boolean | null
          id?: string
          pickup_destination?: string | null
          pickup_required?: boolean | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          updated_at?: string
          user_id: string
          work_date: string
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          forgot_clockout?: boolean | null
          id?: string
          pickup_destination?: string | null
          pickup_required?: boolean | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          updated_at?: string
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_profile_id: string | null
          display_name: string | null
          email: string | null
          hide_line_friendship_prompt: boolean | null
          id: string
          is_admin: boolean | null
          primary_email: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_profile_id?: string | null
          display_name?: string | null
          email?: string | null
          hide_line_friendship_prompt?: boolean | null
          id: string
          is_admin?: boolean | null
          primary_email?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_profile_id?: string | null
          display_name?: string | null
          email?: string | null
          hide_line_friendship_prompt?: boolean | null
          id?: string
          is_admin?: boolean | null
          primary_email?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_current_profile_id_fkey"
            columns: ["current_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { invitation_id: string; target_user_id: string }
        Returns: undefined
      }
      get_invitation_by_token: {
        Args: { lookup_token: string }
        Returns: {
          expires_at: string
          id: string
          password_hash: string
          profile_id: string
          profile_name: string
          role_id: string
          status: string
          store_id: string
          store_name: string
        }[]
      }
      get_profile_by_id_for_invite: {
        Args: { lookup_id: string }
        Returns: {
          id: string
          invite_expires_at: string
          invite_password_hash: string
          invite_status: string
          profile_name: string
          role: string
          store_id: string
          store_name: string
          user_id: string
        }[]
      }
      get_profile_by_invite_token: {
        Args: { lookup_token: string }
        Returns: {
          id: string
          invite_expires_at: string
          invite_password_hash: string
          invite_status: string
          profile_name: string
          role: string
          store_id: string
          store_name: string
          user_id: string
        }[]
      }
      get_user_admin_store_ids: { Args: never; Returns: string[] }
      get_user_profile_ids: { Args: never; Returns: string[] }
      get_user_store_ids: { Args: never; Returns: string[] }
      has_permission: {
        Args: { _permission: string; _store_id: string }
        Returns: boolean
      }
      is_store_admin_or_staff: {
        Args: { lookup_store_id: string }
        Returns: boolean
      }
      is_store_member: { Args: { lookup_store_id: string }; Returns: boolean }
    }
    Enums: {
      profile_status:
        | "在籍中"
        | "未面接"
        | "保留"
        | "不合格"
        | "体入"
        | "休職中"
        | "退店済み"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      profile_status: [
        "在籍中",
        "未面接",
        "保留",
        "不合格",
        "体入",
        "休職中",
        "退店済み",
      ],
    },
  },
} as const
