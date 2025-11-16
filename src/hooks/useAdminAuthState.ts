"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createBrowserClient } from "@/lib/supabaseClient";

const CMS_ROLES = new Set(["admin", "editor"]);

export type AdminAuthState = "loading" | "unauthenticated" | "authorized" | "unauthorized";

export function useAdminAuthState() {
  const supabase = useMemo(() => createBrowserClient() as any, []);
  const [authState, setAuthState] = useState<AdminAuthState>("loading");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const isActiveRef = useRef(true);

  const syncAuth = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();

    if (!isActiveRef.current) {
      return;
    }

    if (error || !data.session) {
      setAuthState("unauthenticated");
      setUserEmail(null);
      return;
    }

    const session = data.session;
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, email, display_name")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!isActiveRef.current) {
      return;
    }

    if (profileError) {
      console.error("プロフィールの取得に失敗しました", profileError);
      setAuthState("unauthorized");
      setUserEmail(session.user.email ?? null);
      return;
    }

    const isAllowed = profile && CMS_ROLES.has(profile.role);

    if (isAllowed) {
      setAuthState("authorized");
      setUserEmail(profile.display_name ?? profile.email ?? session.user.email ?? null);
    } else {
      setAuthState("unauthorized");
      setUserEmail(session.user.email ?? null);
    }
  }, [supabase]);

  useEffect(() => {
    isActiveRef.current = true;

    syncAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      syncAuth();
    });

    return () => {
      isActiveRef.current = false;
      authListener?.subscription.unsubscribe?.();
    };
  }, [supabase, syncAuth]);

  return { supabase, authState, userEmail, refreshAuth: syncAuth };
}
