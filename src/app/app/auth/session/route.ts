import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabaseServerClient";

const SYNC_EVENTS = new Set([
  "SIGNED_IN",
  "TOKEN_REFRESHED",
  "INITIAL_SESSION",
]);

export async function POST(request: Request) {
  const { event, session } = await request.json();
  const supabase = await createServerClient();

  try {
    if (event === "SIGNED_OUT") {
      await supabase.auth.signOut();
      return NextResponse.json({ ok: true });
    }

    if (SYNC_EVENTS.has(event) && session?.access_token && session?.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (error) {
        throw error;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("サーバー側セッションの同期に失敗しました", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
