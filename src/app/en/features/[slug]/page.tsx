import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { featureDetailsEn } from "@/lib/content-en";
import type { FeatureSlug } from "@/lib/content";

interface FeatureDetailPageProps {
  params: { slug: FeatureSlug };
}

export function generateStaticParams() {
  return (Object.keys(featureDetailsEn) as FeatureSlug[]).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: FeatureDetailPageProps): Metadata {
  const feature = featureDetailsEn[params.slug];

  if (!feature) {
    return {
      title: "Feature detail | NightBase",
      description: "Explore how NightBase powers every part of your venue."
    };
  }

  return {
    title: `${feature.title} | NightBase`,
    description: feature.description,
    openGraph: {
      title: `${feature.title} | NightBase`,
      description: feature.description
    }
  };
}

export const dynamicParams = false;

export default function FeatureDetailPageEn({ params }: FeatureDetailPageProps) {
  const feature = featureDetailsEn[params.slug];

  if (!feature) {
    notFound();
  }

  return (
    <div className="pb-24">
      <section className="container pt-20">
        <div className="glass-card p-10">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Feature</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">{feature.title}</h1>
          <p className="mt-4 text-sm text-slate-500">{feature.description}</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">Highlights</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                {feature.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">Impact</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                {feature.metrics.map((metric) => (
                  <li key={metric.label} className="flex items-center justify-between">
                    <span>{metric.label}</span>
                    <span className="font-semibold text-primary">{metric.value}</span>
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
