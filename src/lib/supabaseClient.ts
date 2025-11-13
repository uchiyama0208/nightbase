import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

let hasWarnedForMissingEnv = false;

export function createClient(): SupabaseClient<Database> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!hasWarnedForMissingEnv) {
      console.warn(
        "Supabaseの環境変数が設定されていないため、ブログデータの取得をスキップします。"
      );
      hasWarnedForMissingEnv = true;
    }

    return null;
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);
}
