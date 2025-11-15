import type { ReactNode } from "react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await requireAdminUser();
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
