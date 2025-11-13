import { notFound } from "next/navigation";

import { siteContent } from "@/content/site";

export function generateStaticParams() {
  return siteContent.caseStudies.items.map((caseStudy) => ({ slug: caseStudy.slug }));
}

export default function CaseStudyDetailPage({
  params
}: {
  params: { slug: string };
}) {
  const caseStudy = siteContent.caseStudies.items.find((item) => item.slug === params.slug);

  if (!caseStudy) {
    notFound();
  }

  return (
    <div className="bg-white py-20">
      <div className="container space-y-10">
        <div className="space-y-3">
          <span className="badge">{caseStudy.industry}</span>
          <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{caseStudy.title}</h1>
          <p className="text-lg text-neutral-600">{caseStudy.result}</p>
        </div>
        <div className="glass-panel space-y-6 p-8">
          <blockquote className="rounded-2xl border border-neutral-100 bg-white/80 p-6 text-lg text-neutral-700">
            “{caseStudy.quote.text}”
            <footer className="mt-4 text-sm text-neutral-500">
              {caseStudy.quote.author}・{caseStudy.quote.role}
            </footer>
          </blockquote>
          <div className="grid gap-4 sm:grid-cols-2">
            {caseStudy.metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-neutral-100 bg-white/90 p-6 text-sm">
                <p className="text-neutral-500">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-[#111111]">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
