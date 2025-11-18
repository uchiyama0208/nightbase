import Link from "next/link";

import { AuroraPage } from "@/components/layouts/AuroraPage";

interface ServiceFeature {
  title: string;
  description: string;
}

interface ServicePageTemplateProps {
  title: string;
  lead: string;
  features: ServiceFeature[];
  integrationTitle: string;
  integrationDescription: string;
}

export function ServicePageTemplate({
  title,
  lead,
  features,
  integrationTitle,
  integrationDescription,
}: ServicePageTemplateProps) {
  return (
    <AuroraPage variant="teal" containerClassName="space-y-16">
      <section className="space-y-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">SERVICE</p>
        <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">{title}</h1>
        <p className="mx-auto max-w-3xl text-lg text-neutral-600">{lead}</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/contact" className="glass-button bg-primary text-white hover:text-white">
            お問い合わせ
          </Link>
          <Link href="/pricing" className="glass-button">
            料金プランを見る
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="glass-panel space-y-3 p-8">
            <h2 className="text-xl font-semibold text-[#0f172a]">{feature.title}</h2>
            <p className="text-sm text-neutral-600">{feature.description}</p>
          </div>
        ))}
      </section>

      <section className="glass-panel space-y-4 p-8">
        <h2 className="text-2xl font-semibold text-[#0f172a]">{integrationTitle}</h2>
        <p className="text-sm leading-relaxed text-neutral-600">{integrationDescription}</p>
      </section>

      <section className="glass-panel space-y-4 p-8 text-center">
        <h2 className="text-2xl font-semibold text-[#0f172a]">NightBaseと一緒に導入しませんか？</h2>
        <p className="text-sm text-neutral-600">
          サービスの詳細や費用感など、お気軽にご相談ください。専任チームが導入から運用まで伴走します。
        </p>
        <div className="flex items-center justify-center">
          <Link href="/contact" className="glass-button bg-primary text-white hover:text-white">
            お問い合わせ
          </Link>
        </div>
      </section>
    </AuroraPage>
  );
}
