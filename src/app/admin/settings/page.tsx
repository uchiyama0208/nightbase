export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-200">
      <h1 className="text-2xl font-semibold text-white">管理設定</h1>
      <p className="text-sm text-slate-400">
        NightBase Admin の詳細設定画面です。今後、アクセス権限や通知設定などをこのページから管理できるようにする予定です。
      </p>
    </div>
  );
}
