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
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-white to-[#F0F7FF] pb-24 pt-36">
      <div className="blur-gradient absolute inset-0 opacity-60" aria-hidden />
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
          className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl md:text-6xl"
        >
          {headline}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mt-6 max-w-2xl text-lg text-slate-600"
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
            className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(0,136,255,0.35)] transition hover:bg-primary/90"
          >
            {primaryCta.label}
          </Link>
          <Link
            href={secondaryCta.href}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-primary hover:text-primary"
          >
            {secondaryCta.label}
          </Link>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-16 w-full max-w-5xl rounded-[32px] border border-slate-200 bg-white p-4 shadow-[0_30px_80px_rgba(15,23,42,0.12)]"
        >
          <div className="rounded-[26px] bg-[#F8FAFF] p-10 text-left">
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{locale === "en" ? "Realtime KPIs" : "リアルタイムKPI"}</p>
                <p className="mt-2 text-3xl font-semibold text-primary">+32%</p>
                <p className="text-sm text-slate-500">{locale === "en" ? "RevPAR vs last month" : "先月比RevPAR"}</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{locale === "en" ? "Peak Capacity" : "ピーク稼働率"}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">87%</p>
                <p className="text-sm text-slate-500">{locale === "en" ? "Optimized staffing" : "最適シフト配分"}</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{locale === "en" ? "Talent Score" : "キャストスコア"}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">4.9</p>
                <p className="text-sm text-slate-500">{locale === "en" ? "Customer feedback" : "顧客満足度指標"}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-[-10rem] h-[30rem] bg-gradient-to-t from-[#CCE6FF] to-transparent" />
    </section>
  );
}
