import Link from "next/link";
import { motion } from "framer-motion";

interface CaseStudyCardProps {
  href: string;
  title: string;
  industry: string;
  summary: string;
}

export function CaseStudyCard({ href, title, industry, summary }: CaseStudyCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.4 }}
      className="glass-card flex h-full flex-col justify-between p-6"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">{industry}</p>
        <h3 className="mt-3 text-xl font-semibold text-white">{title}</h3>
        <p className="mt-4 text-sm text-white/60">{summary}</p>
      </div>
      <Link href={href} className="mt-6 inline-flex items-center text-sm font-semibold text-accent hover:text-accent/80">
        Read more →
      </Link>
    </motion.div>
  );
}
