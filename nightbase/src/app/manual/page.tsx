import Link from "next/link";
import type { Metadata } from "next";

import { ManualList } from "@/components/manual/ManualList";
import { getPublishedManualPages } from "@/lib/manual";

export const metadata: Metadata = {
  title: "NightBase マニュアル",
  description:
    "NightBaseの使い方をまとめたオンラインマニュアルです。カテゴリから利用シーンに合ったガイドをお選びください。",
};

export default async function ManualIndexPage() {
  const manualPages = await getPublishedManualPages();
  const uniqueSectionCount = new Set(manualPages.map((page) => page.section)).size;

  return (
    <div className="relative overflow-hidden bg-white py-24">
      <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top,_rgba(0,136,255,0.12),_transparent_55%)]" />
      <div className="container space-y-14">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="space-y-3">
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                Manual
              </span>
              <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">NightBase マニュアル</h1>
              <p className="text-lg text-neutral-600">
                NightBaseの使い方をまとめたオンラインマニュアルです。カテゴリから利用シーンに合ったガイドをお選びください。
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-neutral-500">
              <span className="rounded-full border border-neutral-200 bg-white px-4 py-2">キャストアプリ</span>
              <span className="rounded-full border border-neutral-200 bg-white px-4 py-2">オーナー管理画面</span>
              <span className="rounded-full border border-neutral-200 bg-white px-4 py-2">勤怠・給与</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary/90"
              >
                導入について相談する
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center rounded-full border border-primary/30 px-6 py-3 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
              >
                ブログで使い方を見る
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-neutral-100 bg-white/80 p-8 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">更新情報</p>
            <h2 className="mt-4 text-2xl font-semibold text-[#111111]">カテゴリごとのガイドを随時拡充中</h2>
            <p className="mt-3 text-sm text-neutral-600">
              コンカフェ、クラブ、バーなど業態別の運用ノウハウや、スタッフ教育に使えるチェックリストもまとめています。
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4 text-center">
                <dt className="text-xs uppercase tracking-[0.3em] text-neutral-500">公開ガイド</dt>
                <dd className="text-3xl font-semibold text-[#111111]">{manualPages.length}</dd>
              </div>
              <div className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4 text-center">
                <dt className="text-xs uppercase tracking-[0.3em] text-neutral-500">セクション数</dt>
                <dd className="text-3xl font-semibold text-[#111111]">
                  {uniqueSectionCount}
                </dd>
              </div>
            </dl>
          </div>
        </section>
        <ManualList pages={manualPages} />
      </div>
    </div>
  );
}
