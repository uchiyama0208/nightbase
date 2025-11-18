import { notFound } from "next/navigation";

import { AuroraPage } from "@/components/layouts/AuroraPage";
import { siteContent } from "@/content/site";

export function generateStaticParams() {
  return siteContent.features.sections.map((section) => ({ slug: section.slug }));
}

export default function FeatureDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const section = siteContent.features.sections.find((item) => item.slug === params.slug);

  if (!section) {
    notFound();
  }

  return (
    <AuroraPage variant="indigo" containerClassName="space-y-12">
      <header className="glass-panel space-y-4 p-8">
        <span className="badge w-fit">NightBase Feature</span>
        <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">{section.name}</h1>
        <p className="text-lg text-neutral-600">{section.headline}</p>
        <p className="text-sm text-neutral-500">{section.summary}</p>
      </header>
      <section className="glass-panel space-y-6 p-8">
        <h2 className="text-2xl font-semibold text-[#0f172a]">ハイライト</h2>
        <ul className="space-y-3 text-sm text-neutral-600">
          {section.highlights.map((highlight) => (
            <li key={highlight}>• {highlight}</li>
          ))}
        </ul>
      </section>
      <section className="glass-panel space-y-6 p-8">
        <h2 className="text-2xl font-semibold text-[#0f172a]">主要指標</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {section.metrics.map((metric) => (
            <div key={metric.label} className="glass-panel space-y-1 p-4 text-sm">
              <p className="text-neutral-500">{metric.label}</p>
              <p className="text-2xl font-semibold text-[#0f172a]">{metric.value}</p>
            </div>
          ))}
        </div>
      </section>
    </AuroraPage>
  );
}
