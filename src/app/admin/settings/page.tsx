"use client";

import { AdminProtected } from "@/components/admin/AdminProtected";

function SettingsContent() {
  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-200">
      <h1 className="text-2xl font-semibold text-white">設定</h1>
      <p className="text-sm text-slate-400">
        NightBase 管理画面の設定項目は近日中に追加予定です。現在はプレースホルダーとなっています。
      </p>
    </div>
  );
}

export default function AdminSettingsPage() {
  return <AdminProtected>{() => <SettingsContent />}</AdminProtected>;
}
