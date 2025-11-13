import { notFound } from "next/navigation";

import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of locales) {
    const dictionary = await getDictionary(locale);
    dictionary.features.sections.forEach((section) => {
      params.push({ locale, slug: section.slug });
    });
  }
  return params;
}

export default async function FeatureDetailPage({
  params
}: {
  params: { locale: string; slug: string };
}) {
  const locale = params.locale as Locale;
  const slug = params.slug;

  if (!locales.includes(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale);
  const feature = dictionary.features.sections.find((section) => section.slug === slug);

  if (!feature) {
    notFound();
  }

  return (
    <div className="bg-white py-20">
      <div className="container space-y-10">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{feature.name}</h1>
          <p className="text-lg text-neutral-600">{feature.headline}</p>
        </div>
        <div className="glass-panel space-y-6 p-8">
          <p className="text-sm text-neutral-500">{feature.summary}</p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[#111111]">
                {locale === "ja" ? "ハイライト" : "Highlights"}
              </h2>
              <ul className="space-y-2 text-sm text-neutral-600">
                {feature.highlights.map((highlight) => (
                  <li key={highlight}>• {highlight}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[#111111]">
                {locale === "ja" ? "インパクト" : "Impact"}
              </h2>
              <div className="grid gap-4">
                {feature.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-neutral-100 bg-white/80 p-6 text-sm">
                    <p className="text-neutral-500">{metric.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-[#111111]">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
