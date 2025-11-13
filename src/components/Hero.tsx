"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { HeroDictionary } from "@/lib/i18n/types";

interface HeroProps {
  dictionary: HeroDictionary;
  locale: string;
}

export function Hero({ dictionary, locale }: HeroProps) {
  const buildHref = (href: string) => {
    if (href === "/") return `/${locale}`;
    return `/${locale}${href}`;
  };

  return (
    <section className="relative overflow-hidden bg-white pb-16 pt-24">
      <div className="container grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-10">
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
            className="badge w-fit"
          >
            {dictionary.eyebrow}
          </motion.span>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7, ease: "easeOut" }}
            className="space-y-6"
          >
            <h1 className="text-4xl font-semibold tracking-tight text-[#111111] sm:text-5xl lg:text-6xl">
              {dictionary.title}
            </h1>
            <p className="max-w-xl text-lg text-neutral-600 lg:text-xl">
              {dictionary.description}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7, ease: "easeOut" }}
            className="flex flex-wrap items-center gap-4"
          >
            <Button asChild size="lg">
              <Link href={buildHref(dictionary.primaryCta.href)}>{dictionary.primaryCta.label}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={buildHref(dictionary.secondaryCta.href)}>{dictionary.secondaryCta.label}</Link>
            </Button>
          </motion.div>
          <motion.dl
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease: "easeOut" }}
            className="grid gap-6 sm:grid-cols-3"
          >
            {dictionary.stats.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-soft">
                <dt className="text-sm text-neutral-500">{stat.label}</dt>
                <dd className="mt-2 text-3xl font-semibold text-[#111111]">{stat.value}</dd>
              </div>
            ))}
          </motion.dl>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
          className="relative"
        >
          <div className="glass-panel relative overflow-hidden p-8">
            <div className="absolute -left-10 top-8 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-6 right-8 h-24 w-24 rounded-full bg-secondary/30 blur-2xl" />
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                NightBase Dashboard
              </p>
              <div className="grid gap-4">
                <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-soft">
                  <p className="text-xs font-semibold text-neutral-500">Real-time Revenue</p>
                  <p className="mt-3 text-3xl font-semibold text-[#111111]">¥2,480,000</p>
                  <p className="text-xs text-primary">+18% vs last week</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-soft">
                    <p className="text-xs font-semibold text-neutral-500">AI Shift Suggestion</p>
                    <p className="mt-3 text-lg font-semibold text-[#111111]">Optimal coverage</p>
                    <p className="text-xs text-neutral-500">Cast lineup ready in 2 min</p>
                  </div>
                  <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-soft">
                    <p className="text-xs font-semibold text-neutral-500">VIP Focus</p>
                    <p className="mt-3 text-lg font-semibold text-[#111111]">Top 5 guests</p>
                    <p className="text-xs text-neutral-500">Retention playbook generated</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
