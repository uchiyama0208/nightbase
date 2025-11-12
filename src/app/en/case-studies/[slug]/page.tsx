import { notFound } from "next/navigation";
import { caseStudies } from "@/lib/content";

interface CaseStudyPageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return caseStudies.map((study) => ({ slug: study.slug }));
}

export const dynamicParams = false;

export default function CaseStudyPageEn({ params }: CaseStudyPageProps) {
  const study = caseStudies.find((item) => item.slug === params.slug);

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
