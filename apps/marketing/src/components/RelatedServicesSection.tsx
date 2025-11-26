import Link from "next/link";
import { ArrowRight, Globe, Music4, PenTool, TabletSmartphone } from "lucide-react";

import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { SiteContent } from "@/content/types";

const iconMap = {
  tablet: TabletSmartphone,
  globe: Globe,
  pen: PenTool,
  music: Music4,
};

interface RelatedServicesSectionProps {
  content: SiteContent["home"]["relatedServices"];
}

export function RelatedServicesSection({ content }: RelatedServicesSectionProps) {
  return (
    <section className="relative py-20">
      <div className="container space-y-12">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#94a3b8]">{content.eyebrow}</p>
          <h2 className="text-3xl font-semibold text-[#0f172a] sm:text-4xl">{content.title}</h2>
          <p className="text-[#475569]">{content.description}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {content.cards.map((card) => {
            const Icon = iconMap[card.icon] ?? ArrowRight;
            return (
              <Card
                key={card.href}
                className="flex h-full flex-col justify-between rounded-[32px] border border-white/60 bg-white/70 p-6 shadow-soft backdrop-blur"
              >
                <CardHeader className="space-y-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] text-white">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <CardTitle className="text-2xl text-[#0f172a]">{card.title}</CardTitle>
                  <CardDescription className="text-sm text-[#475569]">{card.description}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Link
                    href={card.href}
                    className="inline-flex items-center gap-2 rounded-full border border-[#0f172a]/20 px-5 py-2 text-sm font-semibold text-[#0f172a] transition hover:border-[#0f172a]/50 hover:bg-white/80"
                  >
                    詳しく見る
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
