"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { HeroContent } from "@/content/types";

interface HeroProps {
  hero: HeroContent;
}

export function Hero({ hero }: HeroProps) {
  const cards = [
    {
      title: "Moon Fever",
      revenue: "¥456,000",
      tag: "VIP更新",
      avatars: ["AY", "MT", "SH"],
      metric: "+18%"
    },
    {
      title: "Space The Final Frontier",
      revenue: "¥382,400",
      tag: "AIおすすめ",
      avatars: ["RK", "AN"],
      metric: "+12%"
    },
    {
      title: "Moon Gazing",
      revenue: "¥200,100",
      tag: "新規予約",
      avatars: ["HM"],
      metric: "+6%"
    }
  ];

  return (
    <section className="relative overflow-hidden bg-aurora pb-24 pt-28">
      <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden>
        <div className="absolute -left-32 top-0 h-64 w-64 rounded-full bg-primary/40 blur-3xl" />
        <div className="absolute bottom-10 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-secondary/40 blur-3xl" />
        <div className="absolute -right-16 top-10 h-64 w-64 rounded-full bg-[#B4A8FF]/40 blur-3xl" />
      </div>
      <div className="container relative grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-10 text-center lg:text-left">
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-4 py-2 text-sm font-medium text-[#6b7280] shadow-soft"
          >
            <span className="h-2 w-2 rounded-full bg-primary" />
            {hero.eyebrow}
          </motion.span>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.7, ease: "easeOut" }}
            className="space-y-6"
          >
            <h1 className="text-4xl font-semibold tracking-tight text-[#0f172a] sm:text-5xl lg:text-6xl">
              {hero.title}
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-[#334155] lg:mx-0 lg:text-xl">{hero.description}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.7, ease: "easeOut" }}
            className="flex flex-wrap items-center justify-center gap-4 lg:justify-start"
          >
            <Button asChild size="lg" className="rounded-full bg-[#111826] px-8 text-white hover:bg-[#111826]/90">
              <Link href={hero.primaryCta.href}>{hero.primaryCta.label}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-white/60 bg-white/40 px-8 text-[#0f172a] backdrop-blur hover:bg-white/70"
            >
              <Link href={hero.secondaryCta.href}>{hero.secondaryCta.label}</Link>
            </Button>
          </motion.div>
          <motion.dl
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.7, ease: "easeOut" }}
            className="grid gap-6 sm:grid-cols-3"
          >
            {hero.stats.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-white/50 bg-white/70 p-6 text-left shadow-soft backdrop-blur">
                <dt className="text-sm text-[#6b7280]">{stat.label}</dt>
                <dd className="mt-2 text-3xl font-semibold text-[#0f172a]">{stat.value}</dd>
              </div>
            ))}
          </motion.dl>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          className="relative flex justify-center lg:justify-end"
        >
          <div className="glass-panel w-full max-w-md space-y-6 bg-white/70 p-8">
            <div className="flex items-center gap-3 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm text-[#475569]">
              <Search size={16} />
              <span>AIが最適な顧客リストを検索中…</span>
            </div>
            <div className="space-y-4">
              {cards.map((card) => (
                <div key={card.title} className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-soft">
                  <div className="flex items-center justify-between text-sm text-[#94a3b8]">
                    <span>{card.tag}</span>
                    <span className="text-[#2563eb] font-semibold">{card.metric}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-[#0f172a]">{card.title}</p>
                      <p className="text-sm text-[#475569]">{card.revenue}</p>
                    </div>
                    <div className="flex -space-x-2">
                      {card.avatars.map((avatar) => (
                        <span
                          key={`${card.title}-${avatar}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#6366f1] to-[#a855f7] text-xs font-semibold text-white"
                        >
                          {avatar}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-[30px] border border-white/50 bg-gradient-to-br from-white/70 via-white/30 to-white/60 p-6">
              <div className="flex items-center justify-between text-sm text-[#0f172a]">
                <p className="font-semibold">Portfolio</p>
                <span className="text-[#6366f1]">ライブ更新</span>
              </div>
              <div className="mt-6 h-32 rounded-2xl bg-gradient-to-br from-[#a5b4fc]/60 via-white/50 to-[#bae6fd]/60">
                <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.7),_transparent_60%)]" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
