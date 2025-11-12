import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { caseStudiesEn } from "@/lib/content-en";
import type { CaseStudy } from "@/lib/content";

interface CaseStudyPageProps {
  params: { slug: CaseStudy["slug"] };
}

export function generateStaticParams() {
  return caseStudiesEn.map((study) => ({ slug: study.slug }));
}

export function generateMetadata({ params }: CaseStudyPageProps): Metadata {
  const study = caseStudiesEn.find((item) => item.slug === params.slug);

  if (!study) {
    return {
      title: "Case Studies | NightBase",
      description: "See how leading venues transform their operations with NightBase."
    };
  }

  return {
    title: `${study.title} | NightBase Case Study`,
    description: study.summary,
    openGraph: {
      title: `${study.title} | NightBase`,
      description: study.summary
    }
  };
}

export const dynamicParams = false;

export default function CaseStudyPageEn({ params }: CaseStudyPageProps) {
  const study = caseStudiesEn.find((item) => item.slug === params.slug);

  if (!study) {
    notFound();
  }

  return (
    <div className="pb-24">
      <section className="container pt-20">
        <div className="glass-card p-10">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Case Study</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">{study.title}</h1>
          <p className="mt-2 text-sm text-white/60">Industry: {study.industry}</p>
          <p className="mt-6 text-sm text-white/70 leading-relaxed">{study.body}</p>
        </div>
      </section>
    </div>
  );
}
