import type { ReactNode } from "react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminLoginCard } from "@/components/admin/AdminLoginCard";
import { AdminNav } from "@/components/admin/AdminNav";
import { getCurrentUserProfile } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await getCurrentUserProfile();

  if (!user) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)] px-4 py-12 text-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-center">
          <AdminLoginCard />
        </div>
      </div>
    );
  }

  if (!profile || (profile.role !== "admin" && profile.role !== "editor")) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)] px-4 py-12 text-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-center">
          <div className="w-full max-w-md rounded-2xl bg-white/95 p-8 text-center text-slate-900 shadow-2xl">
            <h1 className="mb-3 text-2xl font-semibold">管理権限がありません</h1>
            <p className="text-sm text-slate-600">
              このアカウントには NightBase 管理画面へのアクセス権限がありません。
              管理者にお問い合わせください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  const profileAny = profile as any;
  const userEmail =
    profileAny?.display_name ??
    profileAny?.email ??
    user?.email ??
    null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e293b,_#020617)] text-slate-100">
      <div className="flex min-h-screen">
        <AdminNav />
        <div className="flex min-h-screen flex-1 flex-col">
          <AdminHeader userEmail={userEmail} />
          <main className="flex-1 overflow-y-auto px-4 py-10 sm:px-8">
            <div className="mx-auto w-full max-w-6xl space-y-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
