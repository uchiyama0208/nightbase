import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

import type { Database } from "@/types/supabase";
import { getSupabaseConfig } from "./supabaseClient";

export function createServerClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  return createServerComponentClient<Database>({
    cookies,
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
    options: {
      global: {
        fetch,
      },
    },
  });
}
