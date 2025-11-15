import { createServerClient as createSupabaseServerClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "@/types/supabase";
import { getSupabaseConfig } from "./supabaseClient";

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
