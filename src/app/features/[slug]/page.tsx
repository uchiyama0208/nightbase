import { notFound } from "next/navigation";

import { siteContent } from "@/content/site";

export function generateStaticParams() {
  return siteContent.features.sections.map((section) => ({ slug: section.slug }));
}

export default function FeatureDetailPage({
  params
}: {
  params: { slug: string };
}) {
  const section = siteContent.features.sections.find((item) => item.slug === params.slug);

  if (!section) {
    notFound();
  }

  return (
    <div className="bg-white py-20">
      <div className="container space-y-12">
        <header className="space-y-4">
          <span className="badge w-fit">NightBase Feature</span>
          <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{section.name}</h1>
          <p className="text-lg text-neutral-600">{section.headline}</p>
          <p className="text-sm text-neutral-500">{section.summary}</p>
        </header>
        <section className="glass-panel space-y-6 p-8">
          <h2 className="text-2xl font-semibold text-[#111111]">ハイライト</h2>
          <ul className="space-y-3 text-sm text-neutral-600">
            {section.highlights.map((highlight) => (
              <li key={highlight}>• {highlight}</li>
            ))}
          </ul>
        </section>
        <section className="glass-panel space-y-6 p-8">
          <h2 className="text-2xl font-semibold text-[#111111]">主要指標</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {section.metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-neutral-100 bg-white/90 p-6 text-sm">
                <p className="text-neutral-500">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-[#111111]">{metric.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
