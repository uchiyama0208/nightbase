import { FeaturesSection } from "@/components/FeaturesSection";
import { siteContent } from "@/content/site";

export default function FeaturesPage() {
  const { features, home } = siteContent;

  return (
    <div className="bg-white py-20">
      <div className="container mx-auto max-w-3xl space-y-6 text-center">
        <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{features.title}</h1>
        <p className="text-lg text-neutral-600">{features.description}</p>
      </div>
      <div className="container mt-16 space-y-16">
        {features.sections.map((section) => (
          <div key={section.slug} className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-semibold text-[#111111]">{section.name}</h2>
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
                  <div key={metric.label} className="rounded-2xl border border-neutral-100 bg-white/80 p-6 text-sm">
                    <p className="text-neutral-500">{metric.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-[#111111]">{metric.value}</p>
                  </div>
                ))}
              </div>
              <a className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80" href={`/features/${section.slug}`}>
                詳細を見る
              </a>
            </div>
          </div>
        ))}
      </div>
      <div className="container mt-20">
        <FeaturesSection
          title={home.features.title}
          description={home.features.description}
          items={home.features.items}
        />
      </div>
    </div>
  );
}
