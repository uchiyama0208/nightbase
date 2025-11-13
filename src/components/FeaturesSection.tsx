"use client";

import { motion } from "framer-motion";
import type { Feature } from "@/lib/content";

interface FeaturesSectionProps {
  title: string;
  subtitle: string;
  features: Feature[];
}

export function FeaturesSection({ title, subtitle, features }: FeaturesSectionProps) {
  return (
    <section className="container py-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <h2 className="section-heading">{title}</h2>
        <p className="section-subtitle mt-4">{subtitle}</p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: index * 0.05 }}
            className="glass-card flex h-full flex-col justify-between p-6"
          >
            <div>
              <span className="text-3xl">{feature.icon}</span>
              <h3 className="mt-4 text-xl font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm text-white/60">{feature.description}</p>
            </div>
            <div className="mt-6 h-px w-full bg-gradient-to-r from-white/10 via-white/40 to-white/10" />
            <p className="mt-4 text-xs uppercase tracking-[0.3em] text-white/40">NightBase Platform</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
