import type { Metadata } from "next";
import Link from "next/link";

import { AuroraPage } from "@/components/layouts/AuroraPage";
import { INDUSTRIES } from "@/content/industries";

export const metadata: Metadata = {
  title: "夜職別のご提案 | NightBase",
  description:
    "キャバクラ、ラウンジ、クラブ、ガールズバー、コンカフェ、ホスト、バーなど夜の業態別にNightBaseの活用ポイントをご紹介します。"
};

export default function IndustriesIndexPage() {
  return (
    <AuroraPage variant="teal" containerClassName="space-y-12">
      <section className="space-y-6 text-center">
        <span className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/30 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          INDUSTRIES
        </span>
        <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">夜の業種別に、最適なNightBaseを。</h1>
        <p className="mx-auto max-w-3xl text-lg leading-relaxed text-neutral-600">
          キャバクラ、ラウンジ、クラブ、ガルバ、コンカフェ、ホスト、バー。業態ごとに異なるオペレーションをNightBaseがどのように支援できるか、専用ページで詳しくご紹介します。
        </p>
      </section>

      <section>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((industry) => (
            <Link
              key={industry.slug}
              href={`/industries/${industry.slug}`}
              className="glass-panel hover-lift flex h-full flex-col justify-between p-8"
            >
              <div className="space-y-4">
                <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                  {industry.shortLabel}
                </span>
                <h2 className="text-2xl font-semibold text-[#0f172a]">{industry.name}</h2>
                <p className="text-sm leading-7 text-neutral-600">{industry.heroLead}</p>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary transition group-hover:gap-3">
                詳細を見る
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6.5 4.5 9.5 7.5 6.5 10.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </AuroraPage>
  );
}
