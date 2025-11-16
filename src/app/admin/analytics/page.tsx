"use client";

import { AdminProtected } from "@/components/admin/AdminProtected";

function AnalyticsContent() {
  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-200">
      <h1 className="text-2xl font-semibold text-white">分析ダッシュボード</h1>
      <p className="text-sm text-slate-400">
        今後、NightBase の主要 KPI やチーム向けレポートを表示する予定です。現在は準備中です。
      </p>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return <AdminProtected>{() => <AnalyticsContent />}</AdminProtected>;
}
