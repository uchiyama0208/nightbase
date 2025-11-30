import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

export function ensureEnv(name: string, value: string | undefined): string {
  if (!value) {
    // During build time only, return placeholder
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
      if (name === 'NEXT_PUBLIC_SUPABASE_URL') {
        return 'https://placeholder.supabase.co';
      }
      return 'placeholder-key';
    }

    // In development or runtime, throw error
    const errorMessage = `Supabaseの環境変数 "${name}" が設定されていません。NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を .env.local ファイルで設定してください。`;
    throw new Error(errorMessage);
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

let browserClient: SupabaseClient<Database> | null = null;

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

import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build time, return a dummy client
  if (!supabaseUrl || !supabaseAnonKey) {
    // Only throw in browser
    if (typeof window !== 'undefined') {
      throw new Error(
        `Supabaseの環境変数が設定されていません。NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を確認してください。`
      );
    }
    // Return dummy client for build
    return createSupabaseBrowserClient<Database>('https://placeholder.supabase.co', 'placeholder');
  }

  return createSupabaseBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
