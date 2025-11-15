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

  return (
    <div className="bg-white py-24">
      <div className="container mx-auto max-w-6xl space-y-12 px-4 sm:px-6 lg:px-8">
        <header className="space-y-4 text-center">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            MANUAL
          </span>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">NightBase マニュアル</h1>
            <p className="mx-auto max-w-2xl text-base text-neutral-600">
              NightBaseの使い方をまとめたオンラインマニュアルです。カテゴリから利用シーンに合ったガイドをお選びください。
            </p>
          </div>
        </header>
        <ManualList pages={manualPages} />
      </div>
    </div>
  );
}
