import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/supabase";
import { getSupabaseConfig } from "./supabaseClient";

export function createServerClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const cookieStore = cookies() as any;

  const cookieMethods = {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(
        name: string,
        value: string,
        options?: {
          domain?: string;
          expires?: Date;
          httpOnly?: boolean;
          maxAge?: number;
          path?: string;
          sameSite?: "strict" | "lax" | "none";
          secure?: boolean;
        }
      ) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Cookie mutations are not supported in certain rendering modes.
        }
      },
      remove(
        name: string,
        options?: {
          domain?: string;
          expires?: Date;
          httpOnly?: boolean;
          maxAge?: number;
          path?: string;
          sameSite?: "strict" | "lax" | "none";
          secure?: boolean;
        }
      ) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Ignore cookie removal failures in read-only contexts.
        }
      },
    } as any;

  return createSupabaseServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: cookieMethods,
      global: {
        fetch,
      },
    } as any
  );
}
