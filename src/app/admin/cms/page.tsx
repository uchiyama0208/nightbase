import Link from "next/link";
import { ArrowRight, FileText, NotebookPen, ScrollText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const cmsSections = [
  {
    title: "ブログ記事",
    description: "NightBase ブログのコンテンツを作成・公開します。",
    href: "/admin/cms/blog",
    icon: FileText
  },
  {
    title: "導入事例",
    description: "導入事例のストーリーや成果を管理します。",
    href: "/admin/cms/case-studies",
    icon: ScrollText
  },
  {
    title: "マニュアル",
    description: "NightBase 利用マニュアルを Markdown で編集します。",
    href: "/admin/cms/manuals",
    icon: NotebookPen
  }
];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminCmsIndexPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">CMS</p>
        <h1 className="text-3xl font-semibold text-white">コンテンツ管理センター</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Supabase 上の blog_posts / case_studies / manual_pages テーブルと連携し、NightBase 公式サイトの
          コンテンツをリアルタイムで更新できます。
        </p>
      </header>
      <section className="grid gap-6 lg:grid-cols-3">
        {cmsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.href} className="border-white/10 bg-white/5">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
                <div className="rounded-2xl bg-slate-900/80 p-3 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="flex justify-end">
                <Button asChild variant="ghost" className="gap-2 text-primary">
                  <Link href={section.href}>
                    開く <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
