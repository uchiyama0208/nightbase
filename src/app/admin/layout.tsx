import type { ReactNode } from "react";
import Link from "next/link";

import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireAdminUser();

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="border-b border-neutral-200 bg-white">
        <div className="container flex flex-wrap items-center justify-between gap-4 py-6">
          <Link href="/admin" className="text-lg font-semibold text-[#111111]">
            NightBase Admin
          </Link>
          <div className="text-sm text-neutral-500">
            サインイン中: {user.email ?? "管理者"}
          </div>
        </div>
      </header>
      <main className="container space-y-8 py-10">
        <AdminNav />
        <div className="rounded-2xl bg-white p-8 shadow-sm">{children}</div>
      </main>
    </div>
  );
}
