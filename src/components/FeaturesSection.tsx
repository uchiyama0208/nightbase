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
    <section className="bg-white py-20">
      <div className="container space-y-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#111111] sm:text-4xl">{title}</h2>
          <p className="mt-4 text-lg text-neutral-600">{description}</p>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          {items.map((feature) => {
            const Icon = iconMap[feature.icon] ?? Users;
            return (
              <div key={feature.title} className="glass-panel flex h-full flex-col gap-4 p-8">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon size={24} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold text-[#111111]">{feature.title}</h3>
                  <p className="text-neutral-600">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
