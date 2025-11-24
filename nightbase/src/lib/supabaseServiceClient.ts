import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";
import { ensureEnv, getSupabaseConfig } from "./supabaseClient";

export function createServiceRoleClient() {
  const { supabaseUrl } = getSupabaseConfig();
  const serviceRoleKey = ensureEnv("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch,
    },
  });
}
