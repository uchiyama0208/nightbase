import Link from "next/link";
import { Check } from "lucide-react";

import type { PricingPlan } from "@/lib/i18n/types";

interface PricingTableProps {
  title: string;
  description: string;
  plans: PricingPlan[];
  locale: string;
}

export function PricingTable({ title, description, plans, locale }: PricingTableProps) {
  const buildHref = (href: string) => {
    if (href === "/") return `/${locale}`;
    return `/${locale}${href}`;
  };

  return (
    <section className="bg-white py-20">
      <div className="container space-y-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#111111] sm:text-4xl">{title}</h2>
          <p className="mt-4 text-lg text-neutral-600">{description}</p>
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="glass-panel flex h-full flex-col justify-between p-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-[#111111]">{plan.name}</h3>
                    <p className="mt-2 text-sm text-neutral-500">{plan.description}</p>
                  </div>
                  {plan.badge ? <span className="badge">{plan.badge}</span> : null}
                </div>
                <p className="text-3xl font-semibold text-[#111111]">{plan.price}</p>
                <ul className="space-y-3 text-sm text-neutral-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check size={14} />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href={buildHref("/contact")}
                className="mt-8 inline-flex w-full items-center justify-center rounded-full border border-primary bg-primary px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary/90"
              >
                {plan.ctaLabel}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
