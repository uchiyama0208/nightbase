import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const sections = [
  {
    href: "/admin/blog",
    title: "ブログ管理",
    description: "記事の追加・編集・公開ステータスを管理します。",
  },
  {
    href: "/admin/case-studies",
    title: "導入事例管理",
    description: "導入事例のコンテンツを更新し、公開可否を設定します。",
  },
  {
    href: "/admin/manual",
    title: "マニュアル管理",
    description: "マニュアルページの Markdown を編集して公開します。",
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-[#111111]">管理ダッシュボード</h1>
        <p className="text-neutral-600">
          NightBase 公式サイトのコンテンツを Supabase 上のデータと同期しながら管理できます。
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-3">
        {sections.map((section) => (
          <div
            key={section.href}
            className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-neutral-200 p-6 shadow-sm"
          >
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-[#111111]">{section.title}</h2>
              <p className="text-sm text-neutral-600">{section.description}</p>
            </div>
            <Link href={section.href} className={buttonVariants({ variant: "default" })}>
              管理ページへ移動
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
