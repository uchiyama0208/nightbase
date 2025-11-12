import { notFound } from "next/navigation";
import { featureDetails } from "@/lib/content";

interface FeatureDetailPageProps {
  params: { slug: keyof typeof featureDetails };
}

export function generateStaticParams() {
  return Object.keys(featureDetails).map((slug) => ({ slug }));
}

export const dynamicParams = false;

export const metadata = {
  title: "機能詳細 | NightBase"
};

export default function FeatureDetailPage({ params }: FeatureDetailPageProps) {
  const feature = featureDetails[params.slug];

  if (!feature) {
    notFound();
  }

  return (
    <div className="pb-24">
      <section className="container pt-20">
        <div className="glass-card p-10">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Feature</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">{feature.title}</h1>
          <p className="mt-4 text-sm text-white/60">{feature.description}</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">Key Highlights</h2>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                {feature.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">Impact Metrics</h2>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                {feature.metrics.map((metric) => (
                  <li key={metric.label} className="flex items-center justify-between">
                    <span>{metric.label}</span>
                    <span className="font-semibold text-accent">{metric.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
