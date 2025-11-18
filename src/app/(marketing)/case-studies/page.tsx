import Link from "next/link";

import { CaseStudyCard } from "@/components/CaseStudyCard";
import { AuroraPage } from "@/components/layouts/AuroraPage";
import { siteContent } from "@/content/site";
import { getPublishedCaseStudies } from "@/lib/caseStudies";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function CaseStudiesPage() {
  const { caseStudies } = siteContent;
  const studies = await getPublishedCaseStudies();

  return (
    <AuroraPage variant="teal" containerClassName="space-y-16">
      <section className="text-center">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full border border-white/50 bg-white/30 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            Case Studies
          </span>
          <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">{caseStudies.title}</h1>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-neutral-600">{caseStudies.description}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/contact" className="glass-button bg-primary text-white hover:text-white">
              導入について相談する
            </Link>
            <Link href="/blog" className="glass-button">
              ブログで使い方を見る
            </Link>
          </div>
        </div>
      </section>
      <section className="grid gap-8 lg:grid-cols-2">
        {studies.length === 0 ? (
          <div className="glass-panel p-12 text-center text-sm text-neutral-500">
            現在公開中の導入事例はありません。
          </div>
        ) : (
          studies.map((caseStudy) => <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} />)
        )}
      </section>
    </AuroraPage>
  );
}
