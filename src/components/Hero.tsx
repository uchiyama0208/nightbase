"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { HeroContent } from "@/content/types";

interface HeroProps {
  hero: HeroContent;
}

export function Hero({ hero }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-white pb-16 pt-24">
      <div className="container grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-10">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.6, ease: "easeOut" }}
            className="relative w-fit rounded-[32px] bg-white p-4 shadow-soft"
          >
            <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-secondary/30 blur-2xl" />
            <Image
              src="/Nightbase_applogo.png"
              alt="NightBase アプリアイコン"
              width={116}
              height={116}
              priority
              className="h-24 w-24 rounded-[28px] object-contain"
            />
          </motion.div>
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
            className="badge w-fit"
          >
            {hero.eyebrow}
          </motion.span>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
            className="space-y-6"
          >
            <h1 className="text-4xl font-semibold tracking-tight text-[#111111] sm:text-5xl lg:text-6xl">
              {hero.title}
            </h1>
            <p className="max-w-xl text-lg text-neutral-600 lg:text-xl">{hero.description}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
            className="flex flex-wrap items-center gap-4"
          >
            <Button asChild size="lg">
              <Link href={hero.primaryCta.href}>{hero.primaryCta.label}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={hero.secondaryCta.href}>{hero.secondaryCta.label}</Link>
            </Button>
          </motion.div>
          <motion.dl
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" }}
            className="grid gap-6 sm:grid-cols-3"
          >
            {hero.stats.map((stat) => (
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
          transition={{ delay: 0.35, duration: 0.8, ease: "easeOut" }}
          className="relative flex justify-center lg:justify-end"
        >
          <div className="relative flex max-w-md flex-col items-center rounded-[42px] border border-white/60 bg-white/80 p-10 shadow-soft backdrop-blur">
            <div className="pointer-events-none absolute -left-14 top-6 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 right-0 h-32 w-32 rounded-full bg-secondary/40 blur-2xl" />
            <div className="relative flex flex-col items-center gap-6">
              <Image
                src="/ナイトくん_デフォルト.png"
                alt="NightBase マスコットのナイトくん"
                width={280}
                height={280}
                priority
                className="h-[260px] w-[260px] max-w-full object-contain"
              />
              <div className="text-center">
                <p className="text-sm font-semibold text-primary">ナイトくんが店舗運営をサポート</p>
                <p className="text-sm text-neutral-500">24時間体制のカスタマーサクセスで安心をお届け</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
