"use client";

import Link from "next/link";

interface SidebarCtaCardProps {
  context: "blog" | "case-study";
}

export function SidebarCtaCard({ context }: SidebarCtaCardProps) {
  const isBlog = context === "blog";

  const title = isBlog
    ? "NightBaseの活用について相談しませんか？"
    : "NightBaseの導入で同じような成果を目指しませんか？";

  const description = isBlog
    ? "夜職向けのDX・業務効率化について、貴店の状況に合わせてご提案します。"
    : "導入ステップや費用感、他店の活用事例など、具体的なイメージを一緒に整理します。";

  return (
    <aside>
      <div className="glass-panel space-y-5 p-6 lg:p-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            CONTACT
          </p>
          <h2 className="text-xl font-semibold text-[#0f172a] lg:text-2xl">{title}</h2>
          <p className="text-sm leading-relaxed text-neutral-600">{description}</p>
        </div>
        <ul className="space-y-2 text-xs text-neutral-600">
          <li className="flex gap-2">
            <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            <span>最短3日での導入開始が可能です。</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            <span>夜職ならではの運用・ルール設計もサポートします。</span>
          </li>
        </ul>
        <div className="flex flex-col gap-3 pt-2">
          <Link
            href="/contact"
            className="glass-button bg-primary text-white hover:text-white"
          >
            NightBaseに相談する
          </Link>
          <Link href="/contact" className="glass-button text-sm text-primary">
            導入の流れや費用感を知りたい
          </Link>
        </div>
      </div>
    </aside>
  );
}
