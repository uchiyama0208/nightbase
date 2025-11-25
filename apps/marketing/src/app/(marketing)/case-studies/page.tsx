import Link from "next/link";

import { AuroraPage } from "@/components/layouts/AuroraPage";
import { CaseStudyList } from "@/components/CaseStudyList";
import { siteContent } from "@/content/site";
import { getPublishedCaseStudies } from "@/lib/caseStudies";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function CaseStudiesPage() {
  const { caseStudies } = siteContent;
  const studies = await getPublishedCaseStudies();

  return (
    <AuroraPage variant="teal" containerClassName="space-y-16 px-3 sm:px-4">
      <section className="text-center">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full border border-white/50 bg-white/30 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            Case Studies
          </span>
          <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">{caseStudies.title}</h1>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-neutral-600">{caseStudies.description}</p>
        </div>
      </section>
      <CaseStudyList caseStudies={studies} />
    </AuroraPage>
  );
}
