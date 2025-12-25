import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";
import { getSupabaseConfig, ensureEnv } from "./supabaseClient";

/**
 * サーバーサイド用Supabaseクライアントを作成
 * Cookie認証を使用してユーザーセッションを維持
 */
export async function createServerClient(): Promise<SupabaseClient<Database>> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const cookieStore = await cookies();

  return createSupabaseServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      global: {
        fetch,
      },
    }
  ) as SupabaseClient<Database>;
}

/**
 * Service Role Client を作成（RLSをバイパス）
 * 注意: このクライアントはRLSを無視するため、慎重に使用すること
 */
export function createServiceRoleClient(): SupabaseClient<Database> {
  const { supabaseUrl } = getSupabaseConfig();
  const serviceRoleKey = ensureEnv("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch,
    },
  });
}
