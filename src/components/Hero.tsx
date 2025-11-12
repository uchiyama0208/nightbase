"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface HeroProps {
  headline: string;
  subheadline: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  locale?: "ja" | "en";
}

export function Hero({ headline, subheadline, description, primaryCta, secondaryCta, locale = "ja" }: HeroProps) {
  return (
    <section className="relative overflow-hidden pb-24 pt-40">
      <div className="blur-gradient absolute inset-0 opacity-70" aria-hidden />
      <div className="container relative z-10 flex flex-col items-center text-center">
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="hero-highlight mb-8"
        >
          {subheadline}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl"
        >
          {headline}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mt-6 max-w-2xl text-lg text-white/70"
        >
          {description}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href={primaryCta.href}
            className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-night shadow-lg shadow-accent/20 transition hover:bg-accent"
          >
            {primaryCta.label}
          </Link>
          <Link
            href={secondaryCta.href}
            className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:border-accent/60 hover:text-accent"
          >
            {secondaryCta.label}
          </Link>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-16 w-full max-w-5xl rounded-[32px] border border-white/10 bg-white/5 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl"
        >
          <div className="rounded-[26px] bg-night-light/80 p-10 text-left">
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-white/40">{locale === "en" ? "Realtime KPIs" : "リアルタイムKPI"}</p>
                <p className="mt-2 text-3xl font-semibold text-accent">+32%</p>
                <p className="text-sm text-white/50">{locale === "en" ? "RevPAR vs last month" : "先月比RevPAR"}</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-white/40">{locale === "en" ? "Peak Capacity" : "ピーク稼働率"}</p>
                <p className="mt-2 text-3xl font-semibold text-white">87%</p>
                <p className="text-sm text-white/50">{locale === "en" ? "Optimized staffing" : "最適シフト配分"}</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-white/40">{locale === "en" ? "Talent Score" : "キャストスコア"}</p>
                <p className="mt-2 text-3xl font-semibold text-white">4.9</p>
                <p className="text-sm text-white/50">{locale === "en" ? "Customer feedback" : "顧客満足度指標"}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-[-10rem] h-[30rem] bg-gradient-to-t from-night to-transparent" />
    </section>
  );
}
