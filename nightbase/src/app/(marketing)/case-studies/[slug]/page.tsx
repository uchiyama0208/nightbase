export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { formatCaseStudyIndustry, getPublishedCaseStudyBySlug } from "@/lib/caseStudies";
import { formatDate } from "@/lib/utils";

type CaseStudyDetailPageParams = {
  params: { slug: string };
};

function parseMultiline(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export async function generateMetadata({ params }: CaseStudyDetailPageParams): Promise<Metadata> {
  const targetSlug = decodeURIComponent(params.slug).trim();
  const caseStudy = await getPublishedCaseStudyBySlug(targetSlug);

  if (!caseStudy) {
    return {
      title: "導入事例が見つかりません | NightBase",
      description: "お探しの導入事例は現在公開されていません。",
    };
  }

  const fallback = formatCaseStudyIndustry(caseStudy.industry);
  const descriptionPreview = caseStudy.summary?.split(/\r?\n/)[0];
  const descriptionText =
    descriptionPreview?.slice(0, 120) ||
    caseStudy.results?.slice(0, 120) ||
    (fallback ? `${fallback} の導入事例` : "NightBase 導入事例");

  return {
    title: `${caseStudy.title} | NightBase導入事例`,
    description: descriptionText,
  };
}

export default async function CaseStudyDetailPage({ params }: CaseStudyDetailPageParams) {
  const targetSlug = decodeURIComponent(params.slug).trim();
  const caseStudy = await getPublishedCaseStudyBySlug(targetSlug);

  if (!caseStudy) {
    notFound();
  }

  const industryLabel = formatCaseStudyIndustry(caseStudy.industry);
  const summaryItems = parseMultiline(caseStudy.summary);
  const summaryLead = summaryItems[0];
  const problemItems = parseMultiline(caseStudy.problems);
  const solutionItems = parseMultiline(caseStudy.solutions);
  const results = parseMultiline(caseStudy.results);
  const publishedSource = caseStudy.published_at ?? caseStudy.updated_at ?? caseStudy.created_at;
  const publishedLabel = publishedSource ? formatDate(publishedSource) : null;

  return (
    <div className="bg-white py-20">
      <div className="container mx-auto max-w-4xl space-y-16">
        <header className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
              {industryLabel}
            </span>
            {publishedLabel && <span>{publishedLabel}</span>}
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{caseStudy.title}</h1>
            {caseStudy.store_name && <p className="text-sm text-neutral-500">{caseStudy.store_name}</p>}
            {(summaryLead || caseStudy.summary) && (
              <p className="text-lg text-neutral-600">{summaryLead ?? caseStudy.summary}</p>
            )}
          </div>
        </header>

        <section className="space-y-12">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-1">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
                導入前の課題
              </h2>
              <p className="text-sm text-neutral-600">
                現場で直面していた課題を整理し、NightBase で解決すべきポイントを明確にしました。
              </p>
            </div>
            <div className="lg:col-span-2">
              <ul className="space-y-3 text-sm text-neutral-700">
                {problemItems.length > 0 ? (
                  problemItems.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-primary" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-neutral-500">詳細は現在準備中です。</li>
                )}
              </ul>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-1">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">NightBase の活用</h2>
              <p className="text-sm text-neutral-600">NightBase をどのように活用し、オペレーションを改善したのかをまとめています。</p>
            </div>
            <div className="lg:col-span-2">
              <ul className="space-y-3 text-sm text-neutral-700">
                {solutionItems.length > 0 ? (
                  solutionItems.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-secondary" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-neutral-500">詳細は現在準備中です。</li>
                )}
              </ul>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-1">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
                導入後の変化
              </h2>
              <p className="text-sm text-neutral-600">
                導入後に得られた成果やお客様の声をピックアップしています。
              </p>
            </div>
            <div className="lg:col-span-2">
              <ul className="space-y-3 text-sm text-neutral-700">
                {results.length > 0 ? (
                  results.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-primary" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-neutral-500">詳細は現在準備中です。</li>
                )}
              </ul>
            </div>
          </div>
        </section>

        <section className="glass-panel space-y-6 p-8 text-center">
          <h2 className="text-2xl font-semibold text-[#111111]">NightBase の導入についてご相談ください</h2>
          <p className="text-sm text-neutral-600">
            夜職の業種や店舗規模に合わせて、最適な活用方法をご提案します。お気軽にお問い合わせください。
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              導入の相談をする
            </Link>
            <Link
              href="/industries"
              className="inline-flex items-center rounded-full border border-primary px-6 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
            >
              夜職別の活用を見る
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
