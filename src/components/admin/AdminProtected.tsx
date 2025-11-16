"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useAdminAuthState } from "@/hooks/useAdminAuthState";

import { AdminHeader } from "./AdminHeader";
import { AdminLoginCard } from "./AdminLoginCard";
import { AdminNav } from "./AdminNav";

interface AdminProtectedProps {
  children: (context: { supabase: any }) => ReactNode;
}

export function AdminProtected({ children }: AdminProtectedProps) {
  const { supabase, authState, userEmail, refreshAuth } = useAdminAuthState();

  if (authState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)] px-4 py-12 text-slate-100">
        <div className="flex flex-col items-center gap-4 text-sm text-slate-400">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-700 border-t-white" aria-hidden />
          <p>読み込み中です…</p>
        </div>
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)] px-4 py-12 text-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-center">
          <AdminLoginCard />
        </div>
      </div>
    );
  }

  if (authState === "unauthorized") {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)] px-4 py-12 text-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-center">
          <div className="w-full max-w-md space-y-5 rounded-2xl bg-white/95 p-8 text-center text-slate-900 shadow-2xl">
            <h1 className="text-2xl font-semibold">管理権限がありません</h1>
            <p className="text-sm text-slate-600">
              このアカウントには NightBase 管理画面へのアクセス権限がありません。管理者にお問い合わせください。
            </p>
            <Button
              variant="outline"
              className="w-full text-slate-700"
              onClick={async () => {
                await supabase.auth.signOut();
                await refreshAuth();
              }}
            >
              別のアカウントでログイン
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e293b,_#020617)] text-slate-100">
      <div className="flex min-h-screen">
        <AdminNav />
        <div className="flex min-h-screen flex-1 flex-col">
          <AdminHeader userEmail={userEmail} supabaseClient={supabase} onRefreshAuth={refreshAuth} />
          <main className="flex-1 overflow-y-auto px-4 py-10 sm:px-8">
            <div className="mx-auto w-full max-w-6xl space-y-8">{children({ supabase })}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
