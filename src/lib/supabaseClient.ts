import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export function ensureEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Supabaseの環境変数 "${name}" が設定されていません。NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を確認してください。`
    );
  }

  return value;
}

export function getSupabaseConfig() {
  const supabaseUrl = ensureEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = ensureEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return { supabaseUrl, supabaseAnonKey };
}

export function createClient(): SupabaseClient<Database> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch,
    },
  });
}
