import { CalendarRange, Coins, LucideIcon, QrCode, Users } from "lucide-react";

import type { FeatureSummary } from "@/content/types";

const iconMap: Record<string, LucideIcon> = {
  Users,
  CalendarRange,
  Coins,
  QrCode
};

interface FeaturesSectionProps {
  title: string;
  description: string;
  items: FeatureSummary[];
}

export function FeaturesSection({ title, description, items }: FeaturesSectionProps) {
  return (
    <section className="relative py-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(226,232,255,0.5))]" aria-hidden />
      <div className="container relative space-y-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#94a3b8]">Essential</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#0f172a] sm:text-4xl">{title}</h2>
          <p className="mt-4 text-lg text-[#475569]">{description}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((feature) => {
            const Icon = iconMap[feature.icon] ?? Users;
            return (
              <div
                key={feature.title}
                className="group relative h-full rounded-3xl border border-white/60 bg-white/70 p-6 shadow-soft backdrop-blur transition hover:-translate-y-1"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] text-white">
                  <Icon size={22} />
                </div>
                <div className="mt-6 space-y-3">
                  <h3 className="text-2xl font-semibold text-[#0f172a]">{feature.title}</h3>
                  <p className="text-sm text-[#475569]">{feature.description}</p>
                </div>
                <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-[#6366f1]/30 to-transparent" />
                <p className="mt-3 text-xs uppercase tracking-[0.25em] text-[#94a3b8]">NightBase</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
