import Link from "next/link";

import { formatCaseStudyIndustry } from "@/lib/caseStudies";
import { formatDate } from "@/lib/utils";
import type { CaseStudy } from "@/types/case-studies";

interface CaseStudyCardProps {
  caseStudy: CaseStudy;
}

export function CaseStudyCard({ caseStudy }: CaseStudyCardProps) {
  const industryLabel = formatCaseStudyIndustry(caseStudy.industry);
  const publishedLabel = caseStudy.published_at ? formatDate(caseStudy.published_at) : null;
  const summary = caseStudy.summary?.split(/\r?\n/)[0] ?? caseStudy.summary ?? "";
  const slugValue =
    typeof caseStudy.slug === "string" && caseStudy.slug.trim().length > 0
      ? caseStudy.slug.trim()
      : null;
  const href = slugValue ? `/case-studies/${slugValue}` : null;

  return (
    <article className="glass-panel hover-lift group flex h-full flex-col gap-6 p-8 transition-all duration-500">
      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
        <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
          {industryLabel}
        </span>
        {publishedLabel && <span>{publishedLabel}</span>}
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-semibold text-[#111111]">{caseStudy.title}</h3>
        {caseStudy.store_name && <p className="text-sm text-neutral-500">{caseStudy.store_name}</p>}
      </div>
      {summary && <p className="text-sm text-neutral-500">{summary}</p>}
      {href ? (
        <Link
          href={href}
          className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:gap-3"
        >
          事例を読む
          <span aria-hidden>→</span>
        </Link>
      ) : (
        <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-neutral-400">
          詳細ページ準備中
        </span>
      )}
    </article>
  );
}
