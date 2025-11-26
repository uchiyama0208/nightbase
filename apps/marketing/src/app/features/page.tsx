import { FeaturesSection } from "@/components/FeaturesSection";
import { AuroraPage } from "@/components/layouts/AuroraPage";
import { siteContent } from "@/content/site";

export default function FeaturesPage() {
  const { features, home } = siteContent;

  return (
    <AuroraPage variant="indigo" containerClassName="space-y-16">
      <div className="mx-auto max-w-3xl space-y-6 text-center">
        <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">{features.title}</h1>
        <p className="text-lg text-neutral-600">{features.description}</p>
      </div>
      <div className="space-y-16">
        {features.sections.map((section) => (
          <div key={section.slug} className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-semibold text-[#0f172a]">{section.name}</h2>
              <p className="text-lg text-neutral-600">{section.headline}</p>
              <p className="text-sm text-neutral-500">{section.summary}</p>
              <ul className="space-y-3 text-sm text-neutral-600">
                {section.highlights.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="glass-panel space-y-4 p-8">
              <div className="grid grid-cols-2 gap-4">
                {section.metrics.map((metric) => (
                  <div key={metric.label} className="glass-panel space-y-1 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">{metric.label}</p>
                    <p className="text-2xl font-semibold text-[#0f172a]">{metric.value}</p>
                  </div>
                ))}
              </div>
              <a className="glass-button" href={`/features/${section.slug}`}>
                詳細を見る
              </a>
            </div>
          </div>
        ))}
      </div>
      <FeaturesSection title={home.features.title} description={home.features.description} items={home.features.items} />
    </AuroraPage>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
