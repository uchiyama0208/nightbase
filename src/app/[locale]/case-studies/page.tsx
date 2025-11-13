import { notFound } from "next/navigation";

import { CaseStudyCard } from "@/components/CaseStudyCard";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export default async function CaseStudiesPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  if (!locales.includes(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale);
  const caseStudies = dictionary.caseStudies;

  return (
    <div className="bg-white py-20">
      <div className="container mx-auto max-w-3xl space-y-6 text-center">
        <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{caseStudies.title}</h1>
        <p className="text-lg text-neutral-600">{caseStudies.description}</p>
      </div>
      <div className="container mt-16 grid gap-8 lg:grid-cols-2">
        {caseStudies.items.map((caseStudy) => (
          <CaseStudyCard key={caseStudy.slug} caseStudy={caseStudy} locale={locale} />
        ))}
      </div>
    </div>
  );
}
