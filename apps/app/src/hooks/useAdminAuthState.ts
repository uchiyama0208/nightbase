"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { createBrowserClient } from "@/lib/supabaseClient";

export type AdminAuthState = "loading" | "unauthenticated" | "authorized" | "unauthorized";

export function useAdminAuthState() {
  const supabase = useMemo(() => createBrowserClient() as any, []);
  const [authState, setAuthState] = useState<AdminAuthState>("loading");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const isActiveRef = useRef(true);

  const syncServerSession = useCallback(
    async (event: AuthChangeEvent | "INITIAL_SESSION", session: Session | null) => {
      try {
        await fetch("/auth/session", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ event, session }),
        });
      } catch (error) {
        console.error("サーバーセッションの同期に失敗しました", error);
      }
    },
    []
  );

  const syncAuth = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();

    if (!isActiveRef.current) {
      return;
    }

    if (error || !data.session) {
      await syncServerSession("SIGNED_OUT", null);
      setAuthState("unauthenticated");
      setUserEmail(null);
      return;
    }

    const session = data.session;
    await syncServerSession("INITIAL_SESSION", session);

    // usersテーブルからis_adminをチェック
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("is_admin, display_name, email")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!isActiveRef.current) {
      return;
    }

    if (userError) {
      console.error("ユーザー情報の取得に失敗しました", userError);
      setAuthState("unauthorized");
      setUserEmail(session.user.email ?? null);
      return;
    }

    if (user?.is_admin) {
      setAuthState("authorized");
      setUserEmail(user.display_name ?? user.email ?? session.user.email ?? null);
    } else {
      setAuthState("unauthorized");
      setUserEmail(session.user.email ?? null);
    }
  }, [supabase, syncServerSession]);

  useEffect(() => {
    isActiveRef.current = true;

    syncAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      syncServerSession(event, session);
      syncAuth();
    });

    return () => {
      isActiveRef.current = false;
      authListener?.subscription.unsubscribe?.();
    };
  }, [supabase, syncAuth, syncServerSession]);

  return { supabase, authState, userEmail, refreshAuth: syncAuth };
}
