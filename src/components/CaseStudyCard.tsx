import Link from "next/link";

import type { CaseStudy } from "@/lib/i18n/types";

interface CaseStudyCardProps {
  locale: string;
  caseStudy: CaseStudy;
}

export function CaseStudyCard({ caseStudy, locale }: CaseStudyCardProps) {
  const buildHref = (slug: string) => `/${locale}/case-studies/${slug}`;
  const readLabel = locale === "ja" ? "事例を読む →" : "Read story →";

  return (
    <article className="glass-panel flex h-full flex-col gap-6 p-8">
      <div className="badge w-fit">{caseStudy.industry}</div>
      <h3 className="text-2xl font-semibold text-[#111111]">{caseStudy.title}</h3>
      <p className="text-sm text-neutral-500">{caseStudy.summary}</p>
      <blockquote className="rounded-2xl border border-neutral-100 bg-white/80 p-5 text-sm text-neutral-600">
        “{caseStudy.quote.text}”
        <footer className="mt-3 text-xs text-neutral-500">
          {caseStudy.quote.author}・{caseStudy.quote.role}
        </footer>
      </blockquote>
      <div className="grid grid-cols-2 gap-4">
        {caseStudy.metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-neutral-100 bg-white/70 p-4 text-sm">
            <p className="text-neutral-500">{metric.label}</p>
            <p className="mt-1 text-xl font-semibold text-[#111111]">{metric.value}</p>
          </div>
        ))}
      </div>
      <Link
        href={buildHref(caseStudy.slug)}
        className="mt-auto text-sm font-semibold text-primary hover:text-primary/80"
      >
        {readLabel}
      </Link>
    </article>
  );
}
