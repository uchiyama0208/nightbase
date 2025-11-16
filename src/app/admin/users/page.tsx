"use client";

import { AdminProtected } from "@/components/admin/AdminProtected";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function UsersContent() {
  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-200">
      <h1 className="text-2xl font-semibold text-white">ユーザー管理</h1>
      <p className="text-sm text-slate-400">
        プロファイルのロール設定やメンバー管理のための UI は準備中です。Supabase ダッシュボードから直接調整してください。
      </p>
    </div>
  );
}

export default function AdminUsersPage() {
  return <AdminProtected>{() => <UsersContent />}</AdminProtected>;
}
