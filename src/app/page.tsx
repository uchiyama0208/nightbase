import Link from "next/link";

import { CaseStudyCard } from "@/components/CaseStudyCard";
import { ContactForm } from "@/components/ContactForm";
import { FeaturesSection } from "@/components/FeaturesSection";
import { Hero } from "@/components/Hero";
import { PricingTable } from "@/components/PricingTable";
import { RelatedServicesSection } from "@/components/RelatedServicesSection";
import { INDUSTRIES } from "@/content/industries";
import { siteContent } from "@/content/site";
import { getPublishedCaseStudies } from "@/lib/caseStudies";

export default async function HomePage() {
  const { home, caseStudies, contact } = siteContent;
  const caseStudyEntries = await getPublishedCaseStudies(4);
  const highlightStats = [
    { value: "30%", label: "業務時間削減", description: "業務設計を再構築し、現場のムダを削減" },
    { value: "1.5x", label: "生産性向上", description: "キャスト・スタッフの稼働率を最大化" },
    { value: "2k+", label: "業界データ", description: "豊富なナレッジで意思決定をサポート" }
  ];

  return (
    <div className="space-y-0">
      <Hero hero={home.hero} />

      <section className="relative py-16">
        <div className="container grid gap-6 md:grid-cols-3">
          {highlightStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-3xl border border-white/60 bg-white/70 px-8 py-10 text-center shadow-soft backdrop-blur"
            >
              <p className="text-4xl font-semibold text-[#0f172a]">{stat.value}</p>
              <p className="mt-2 text-sm font-semibold text-[#64748b]">{stat.label}</p>
              <p className="mt-3 text-sm text-[#475569]">{stat.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative py-20">
        <div className="absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.7),_transparent_65%)]" aria-hidden />
        <div className="container space-y-10">
          <div className="mx-auto max-w-3xl text-center space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#94a3b8]">INDUSTRIES</p>
            <h2 className="text-3xl font-semibold text-[#0f172a] sm:text-4xl">夜の業種別に NightBase を見る</h2>
            <p className="text-[#475569]">
              キャバクラ、ラウンジ、クラブ、ガルバ、コンカフェ、ホスト、バー…。お店のスタイルに合わせて、NightBase の活用ポイントをご提案します。
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {INDUSTRIES.map((industry) => (
              <Link
                key={industry.slug}
                href={`/industries/${industry.slug}`}
                className="inline-flex items-center justify-center rounded-2xl border border-white/50 bg-white/70 px-6 py-3 text-sm font-semibold text-[#0f172a] shadow-soft transition hover:-translate-y-1"
              >
                {industry.shortLabel}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20">
        <div className="container grid gap-12 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#94a3b8]">Workflow</p>
            <h2 className="text-3xl font-semibold text-[#0f172a] sm:text-4xl">{home.beforeAfter.title}</h2>
            <p className="text-[#475569]">NightBaseは現場の声をもとに、最も時間を奪うオペレーションを再設計しました。</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-white/50 bg-white/80 p-6 shadow-soft backdrop-blur">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#94a3b8]">
                {home.beforeAfter.problems.title}
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-[#475569]">
                {home.beforeAfter.problems.bullets.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-transparent bg-gradient-to-br from-[#c7d2fe] via-white to-[#bae6fd] p-6 shadow-soft">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#4338ca]">
                {home.beforeAfter.solutions.title}
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-[#0f172a]">
                {home.beforeAfter.solutions.bullets.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <FeaturesSection
        title={home.features.title}
        description={home.features.description}
        items={home.features.items}
      />

      <section className="relative py-20">
        <div className="container grid gap-12 rounded-[48px] border border-white/50 bg-white/70 p-10 shadow-soft backdrop-blur lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#94a3b8]">Easy</p>
            <h2 className="text-3xl font-semibold text-[#0f172a] sm:text-4xl">{home.uiPreview.title}</h2>
            <p className="text-lg text-[#475569]">{home.uiPreview.description}</p>
            <ul className="space-y-3 text-sm text-[#475569]">
              {home.uiPreview.highlights.map((highlight) => (
                <li key={highlight} className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#a5b4fc] to-[#bae6fd] text-[#0f172a]">
                    •
                  </span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-6">
            <div className="rounded-[36px] border border-white/60 bg-gradient-to-br from-white via-white/60 to-[#dbeafe] p-8 shadow-soft">
              <p className="text-sm font-semibold text-[#94a3b8]">今日のKPI</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-[#94a3b8]">売上</p>
                  <p className="text-2xl font-semibold text-[#0f172a]">¥820,000</p>
                  <p className="text-xs text-[#2563eb]">先週比 +12%</p>
                </div>
                <div>
                  <p className="text-xs text-[#94a3b8]">VIP来店</p>
                  <p className="text-2xl font-semibold text-[#0f172a]">38</p>
                  <p className="text-xs text-[#2563eb]">+6 件</p>
                </div>
              </div>
            </div>
            <div className="rounded-[36px] border border-white/50 bg-white/80 p-8 shadow-soft">
              <p className="text-sm font-semibold text-[#94a3b8]">キャストコンディション</p>
              <div className="mt-4 grid gap-3">
                {[
                  { label: "稼働率", value: "98%" },
                  { label: "満足度", value: "4.8/5" }
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-full bg-white/80 px-4 py-2 text-sm text-[#0f172a]">
                    <span className="text-[#94a3b8]">{item.label}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-20">
        <div className="container space-y-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#94a3b8]">Light & Glass</p>
            <h2 className="mt-4 text-3xl font-semibold text-[#0f172a] sm:text-4xl">{home.forWhom.title}</h2>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            {home.forWhom.segments.map((segment) => (
              <div key={segment.title} className="rounded-[36px] border border-white/60 bg-white/70 p-8 shadow-soft backdrop-blur">
                <h3 className="text-2xl font-semibold text-[#0f172a]">{segment.title}</h3>
                <p className="mt-3 text-sm text-[#475569]">{segment.description}</p>
                <ul className="mt-6 space-y-2 text-sm text-[#475569]">
                  {segment.benefits.map((benefit) => (
                    <li key={benefit}>• {benefit}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20">
        <div className="container space-y-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold text-[#0f172a] sm:text-4xl">{home.testimonials.title}</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {home.testimonials.items.map((testimonial) => (
              <div key={testimonial.quote} className="rounded-[36px] border border-white/60 bg-white/80 p-8 shadow-soft backdrop-blur">
                <p className="text-lg text-[#0f172a]">“{testimonial.quote}”</p>
                <div className="mt-6 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#a5b4fc] to-[#bae6fd] text-sm font-semibold text-[#0f172a]">
                    {testimonial.avatarInitials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">{testimonial.name}</p>
                    <p className="text-xs text-[#94a3b8]">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20">
        <div className="container space-y-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold text-[#0f172a] sm:text-4xl">{caseStudies.title}</h2>
            <p className="mt-4 text-[#475569]">{caseStudies.description}</p>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            {caseStudyEntries.length === 0 ? (
              <div className="col-span-full rounded-3xl border border-white/60 bg-white/80 p-10 text-center text-sm text-[#94a3b8]">
                公開中の導入事例は現在準備中です。最新情報はブログやニュースでお知らせします。
              </div>
            ) : (
              caseStudyEntries.map((caseStudy) => (
                <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} />
              ))
            )}
          </div>
        </div>
      </section>

      <RelatedServicesSection content={home.relatedServices} />

      <PricingTable
        title={home.pricing.title}
        description={home.pricing.description}
        plans={home.pricing.plans}
      />

      <section className="relative py-20">
        <div className="container grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[36px] border border-white/60 bg-white/70 p-8 shadow-soft backdrop-blur">
            <h2 className="text-3xl font-semibold text-[#0f172a] sm:text-4xl">{home.security.title}</h2>
            <ul className="mt-6 space-y-3 text-sm text-[#475569]">
              {home.security.bullets.map((bullet) => (
                <li key={bullet}>• {bullet}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[36px] border border-white/60 bg-white/70 p-8 shadow-soft backdrop-blur">
            <h2 className="text-3xl font-semibold text-[#0f172a] sm:text-4xl">{home.about.title}</h2>
            <p className="mt-4 text-sm text-[#475569]">{home.about.mission}</p>
            <p className="mt-2 text-sm text-[#475569]">{home.about.vision}</p>
          </div>
        </div>
      </section>

      <section className="relative py-20">
        <div className="container grid gap-10 rounded-[48px] border border-white/50 bg-gradient-to-br from-white via-white/60 to-[#e0f2fe] p-10 shadow-soft backdrop-blur lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold text-[#0f172a] sm:text-4xl">{home.finalCta.title}</h2>
            <p className="text-[#475569]">{home.finalCta.description}</p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href={home.finalCta.primaryCta.href}
                className="inline-flex items-center rounded-full bg-[#111826] px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-[#111826]/90"
              >
                {home.finalCta.primaryCta.label}
              </a>
              <a
                href={home.finalCta.secondaryCta.href}
                className="inline-flex items-center rounded-full border border-[#111826] px-6 py-3 text-sm font-semibold text-[#111826] transition hover:bg-[#111826]/5"
              >
                {home.finalCta.secondaryCta.label}
              </a>
            </div>
          </div>
          <ContactForm content={contact} />
        </div>
      </section>
    </div>
  );
}
