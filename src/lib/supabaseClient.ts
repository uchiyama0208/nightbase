import { createServerClient as createSupabaseServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

function ensureEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Supabaseの環境変数 \"${name}\" が設定されていません。NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を確認してください。`
    );
  }

  return value;
}

function getSupabaseConfig() {
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

export function createServerClient(): SupabaseClient<Database> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const cookieStore = cookies();

  return createSupabaseServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          console.warn("Cookie set is only supported in Server Actions or Route Handlers", error);
        }
      },
      remove(name: string, options) {
        try {
          cookieStore.delete({ name, ...options });
        } catch (error) {
          console.warn("Cookie delete is only supported in Server Actions or Route Handlers", error);
        }
      },
    },
  });
}
