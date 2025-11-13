"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { PricingPlan } from "@/lib/content";

interface PricingTableProps {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  plans: PricingPlan[];
}

export function PricingTable({ title, subtitle, ctaHref, ctaLabel, plans }: PricingTableProps) {
  return (
    <section className="container py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="section-heading">{title}</h2>
        <p className="section-subtitle mt-4">{subtitle}</p>
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: index * 0.05 }}
            className={`relative flex h-full flex-col justify-between rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] ${
              plan.featured ? "ring-1 ring-primary/30" : ""
            }`}
          >
            {plan.featured ? (
              <span className="absolute right-6 top-6 rounded-full bg-secondary/30 px-3 py-1 text-xs font-semibold text-secondary">
                {plan.highlight}
              </span>
            ) : (
              <span className="text-xs uppercase tracking-[0.4em] text-slate-400">{plan.highlight}</span>
            )}
            <div className="mt-6 space-y-3">
              <h3 className="text-2xl font-semibold text-slate-900">{plan.name}</h3>
              <p className="text-3xl font-bold text-primary">{plan.price}</p>
              <p className="text-sm text-slate-600">{plan.description}</p>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href={ctaHref}
              className={`mt-10 inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold transition ${
                plan.featured
                  ? "border-transparent bg-primary text-white shadow-[0_18px_40px_rgba(0,136,255,0.25)] hover:bg-primary/90"
                  : "border-slate-300 bg-white text-slate-900 hover:border-primary hover:text-primary"
              }`}
            >
              {ctaLabel}
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
