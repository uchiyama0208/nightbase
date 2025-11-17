import Link from "next/link";
import { Check } from "lucide-react";

import type { PricingPlan } from "@/content/types";

interface PricingTableProps {
  title: string;
  description: string;
  plans: PricingPlan[];
}

export function PricingTable({ title, description, plans }: PricingTableProps) {
  return (
    <section className="relative py-20">
      <div className="container space-y-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#0f172a] sm:text-4xl">{title}</h2>
          <p className="mt-4 text-lg text-[#475569]">{description}</p>
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-[36px] border border-white/60 bg-white/70 p-8 shadow-soft backdrop-blur">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-[#0f172a]">{plan.name}</h3>
                    <p className="mt-2 text-sm text-[#64748b]">{plan.description}</p>
                  </div>
                  {plan.badge ? <span className="badge bg-gradient-to-r from-[#8b5cf6]/20 to-[#6366f1]/20 text-[#4f46e5]">{plan.badge}</span> : null}
                </div>
                <p className="text-3xl font-semibold text-[#0f172a]">{plan.price}</p>
                <ul className="space-y-3 text-sm text-[#475569]">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#a5b4fc] to-[#bae6fd] text-[#0f172a]">
                        <Check size={14} />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/contact"
                className="mt-8 inline-flex w-full items-center justify-center rounded-full border border-[#0f172a] bg-[#0f172a] px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-[#0f172a]/90"
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
