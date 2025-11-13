"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface CaseStudyCardProps {
  href: string;
  title: string;
  industry: string;
  summary: string;
  ctaLabel?: string;
}

export function CaseStudyCard({ href, title, industry, summary, ctaLabel = "Read more →" }: CaseStudyCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.4 }}
      className="glass-card flex h-full flex-col justify-between p-6"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{industry}</p>
        <h3 className="mt-3 text-xl font-semibold text-slate-900">{title}</h3>
        <p className="mt-4 text-sm text-slate-600">{summary}</p>
      </div>
      <Link href={href} className="mt-6 inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80">
        {ctaLabel}
      </Link>
    </motion.div>
  );
}
