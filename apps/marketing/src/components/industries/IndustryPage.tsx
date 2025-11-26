import Link from "next/link";

import { AuroraPage } from "@/components/layouts/AuroraPage";
import type { IndustryContent } from "@/content/industries";

const adoptionSteps = [
  {
    title: "ヒアリング",
    description: "現在の管理方法と課題を整理し、NightBaseで解決すべきポイントを明確にします。"
  },
  {
    title: "トライアル運用",
    description: "実際のシフトや売上データを用いた運用テストで、現場へのフィット感を確認します。"
  },
  {
    title: "本番運用・定着支援",
    description: "導入後も専任チームが定着を支援し、アップデートや改善を継続的にご提案します。"
  }
];

interface IndustryPageProps {
  industry: IndustryContent;
}

export function IndustryPage({ industry }: IndustryPageProps) {
  return (
    <AuroraPage variant="teal" containerClassName="space-y-16">
      <section className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            FOR {industry.shortLabel}向け
          </span>
          <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">{industry.heroTitle}</h1>
          <p className="text-lg leading-relaxed text-neutral-600">{industry.heroLead}</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/contact" className="glass-button bg-primary text-white hover:text-white">
              無料で相談する
            </Link>
            <Link href="/features" className="glass-button">
              機能一覧を見る
            </Link>
          </div>
        </div>
        <div className="glass-panel space-y-6 p-8">
          <h2 className="text-lg font-semibold text-[#0f172a]">{industry.name}</h2>
          <p className="text-sm text-neutral-600">
            NightBaseは、{industry.shortLabel}の現場で蓄積した知見をもとに業務フローを再設計。チーム全体で使いやすいUIと自動化で、日々のオペレーションを支えます。
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="glass-panel space-y-1 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">導入店舗</p>
              <p className="text-2xl font-semibold text-[#0f172a]">120+</p>
            </div>
            <div className="glass-panel space-y-1 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">平均業務削減</p>
              <p className="text-2xl font-semibold text-[#0f172a]">-43%</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-[#0f172a] sm:text-4xl">{industry.problemsTitle}</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {industry.problems.map((problem) => (
            <div key={problem} className="glass-panel text-sm leading-7 text-neutral-600 p-6">
              {problem}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-[#0f172a] sm:text-4xl">{industry.solutionsTitle}</h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {industry.solutions.map((solution) => (
            <div key={solution} className="glass-panel space-y-3 p-8">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary/20 text-sm font-semibold text-secondary">
                •
              </span>
              <p className="text-sm leading-7 text-neutral-600">{solution}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-[#0f172a] sm:text-4xl">{industry.featureTitle}</h2>
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          {industry.features.map((feature) => (
            <div key={feature.title} className="glass-panel space-y-4 p-8">
              <h3 className="text-xl font-semibold text-[#0f172a]">{feature.title}</h3>
              <p className="text-sm leading-7 text-neutral-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-[#0f172a] sm:text-4xl">導入の流れ</h2>
          <p className="mt-4 text-neutral-600">専任チームがスムーズなスタートと定着まで伴走します。</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {adoptionSteps.map((step) => (
            <div key={step.title} className="glass-panel p-8 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">{step.title}</p>
              <p className="mt-4 text-sm leading-7 text-neutral-600">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel grid gap-8 p-12 text-center lg:grid-cols-[1fr_auto] lg:text-left">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">TAILORED FOR {industry.shortLabel}</p>
          <h2 className="text-3xl font-semibold text-[#0f172a] sm:text-4xl">この業種でのNightBase活用について相談しませんか？</h2>
          <p className="text-neutral-600">
            導入検討から運用定着まで、NightBaseチームが伴走します。まずはお気軽にご相談ください。
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 lg:items-end">
          <Link href="/contact" className="glass-button bg-primary text-white hover:text-white">
            無料で相談する
          </Link>
          <Link href="/case-studies" className="glass-button">
            導入事例を見る
          </Link>
        </div>
      </section>
    </AuroraPage>
  );
}
