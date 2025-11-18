import Link from "next/link";
import type { Metadata } from "next";

import { ManualList } from "@/components/manual/ManualList";
import { AuroraPage } from "@/components/layouts/AuroraPage";
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
    <AuroraPage variant="violet" containerClassName="space-y-14">
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-full border border-white/40 bg-white/30 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Manual
            </span>
            <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">NightBase マニュアル</h1>
            <p className="text-lg text-neutral-600">
              NightBaseの使い方をまとめたオンラインマニュアルです。カテゴリから利用シーンに合ったガイドをお選びください。
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-neutral-500">
            <span className="glass-button bg-white/50 text-neutral-600">キャストアプリ</span>
            <span className="glass-button bg-white/50 text-neutral-600">オーナー管理画面</span>
            <span className="glass-button bg-white/50 text-neutral-600">勤怠・給与</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="glass-button bg-primary text-white hover:text-white">
              導入について相談する
            </Link>
            <Link href="/blog" className="glass-button">
              ブログで使い方を見る
            </Link>
          </div>
        </div>
        <div className="glass-panel space-y-4 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">更新情報</p>
          <h2 className="text-2xl font-semibold text-[#0f172a]">カテゴリごとのガイドを随時拡充中</h2>
          <p className="text-sm text-neutral-600">
            コンカフェ、クラブ、バーなど業態別の運用ノウハウや、スタッフ教育に使えるチェックリストもまとめています。
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="glass-panel space-y-1 p-4 text-center">
              <dt className="text-xs uppercase tracking-[0.3em] text-neutral-500">公開ガイド</dt>
              <dd className="text-3xl font-semibold text-[#0f172a]">{manualPages.length}</dd>
            </div>
            <div className="glass-panel space-y-1 p-4 text-center">
              <dt className="text-xs uppercase tracking-[0.3em] text-neutral-500">セクション数</dt>
              <dd className="text-3xl font-semibold text-[#0f172a]">{uniqueSectionCount}</dd>
            </div>
          </dl>
        </div>
      </section>
      <ManualList pages={manualPages} />
    </AuroraPage>
  );
}
