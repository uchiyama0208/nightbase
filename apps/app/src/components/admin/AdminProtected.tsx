"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useAdminAuthState } from "@/hooks/useAdminAuthState";

import { AdminLoginCard } from "./AdminLoginCard";

interface AdminProtectedProps {
  children: (context: { supabase: any; userEmail: string | null }) => ReactNode;
}

export function AdminProtected({ children }: AdminProtectedProps) {
  const { supabase, authState, userEmail, refreshAuth } = useAdminAuthState();

  if (authState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
        <div className="flex flex-col items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-blue-600" aria-hidden />
          <p>読み込み中です…</p>
        </div>
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12">
        <div className="mx-auto flex max-w-6xl items-center justify-center">
          <AdminLoginCard />
        </div>
      </div>
    );
  }

  if (authState === "unauthorized") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12">
        <div className="mx-auto flex max-w-6xl items-center justify-center">
          <div className="w-full max-w-md space-y-5 rounded-2xl bg-white dark:bg-gray-800 p-8 text-center shadow-xl">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">管理権限がありません</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              このアカウントには NightBase 管理画面へのアクセス権限がありません。管理者にお問い合わせください。
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              ログイン中: {userEmail}
            </p>
            <Button
              variant="outline"
              className="w-full"
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

  return <>{children({ supabase, userEmail })}</>;
}
