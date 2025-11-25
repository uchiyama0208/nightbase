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
  const coverImageUrl = caseStudy.cover_image_url ?? "";

  const inner = (
    <article className="glass-panel hover-lift group flex h-full flex-col justify-between gap-6 p-8 transition-all duration-500">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
            {industryLabel}
          </span>
          {publishedLabel && <span>{publishedLabel}</span>}
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold text-[#111111] group-hover:text-primary">
            {caseStudy.title}
          </h3>
          {caseStudy.store_name && <p className="text-sm text-neutral-500">{caseStudy.store_name}</p>}
        </div>
        {summary && <p className="text-sm text-neutral-500">{summary}</p>}
        {coverImageUrl ? (
          <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-neutral-100">
            <div className="aspect-[16/9] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImageUrl}
                alt={caseStudy.title}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="aspect-[16/9] w-full px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
                NightBase Case Study
              </p>
              <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-50">{caseStudy.title}</p>
            </div>
          </div>
        )}
      </div>
      {href ? (
        <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <span>事例を読む</span>
          <span aria-hidden>→</span>
        </div>
      ) : (
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-neutral-400">
          詳細ページ準備中
        </span>
      )}
    </article>
  );

  if (!href) {
    return inner;
  }

  return (
    <Link
      href={href}
      className="group block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/40"
    >
      {inner}
    </Link>
  );
}
