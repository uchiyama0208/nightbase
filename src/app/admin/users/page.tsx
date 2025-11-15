export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminUsersPage() {
  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-200">
      <h1 className="text-2xl font-semibold text-white">ユーザー管理</h1>
      <p className="text-sm text-slate-400">
        管理者チームの招待やロール管理をこのページに追加する予定です。現在は開発中です。
      </p>
    </div>
  );
}
