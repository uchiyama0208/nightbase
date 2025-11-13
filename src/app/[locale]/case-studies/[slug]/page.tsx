import { notFound } from "next/navigation";

import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of locales) {
    const dictionary = await getDictionary(locale);
    dictionary.caseStudies.items.forEach((caseStudy) => {
      params.push({ locale, slug: caseStudy.slug });
    });
  }
  return params;
}

export default async function CaseStudyDetailPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = localeParam as Locale;

  if (!locales.includes(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale);
  const caseStudy = dictionary.caseStudies.items.find((item) => item.slug === slug);

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
