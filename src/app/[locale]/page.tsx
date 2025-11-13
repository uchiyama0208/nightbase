import { notFound } from "next/navigation";

import { CaseStudyCard } from "@/components/CaseStudyCard";
import { ContactForm } from "@/components/ContactForm";
import { FeaturesSection } from "@/components/FeaturesSection";
import { Hero } from "@/components/Hero";
import { PricingTable } from "@/components/PricingTable";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  if (!locales.includes(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale);
  const home = dictionary.home;

  return (
    <div>
      <Hero dictionary={home.hero} locale={locale} />

      <section className="bg-white py-20">
        <div className="container grid gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-[#111111] sm:text-4xl">{home.beforeAfter.title}</h2>
            <p className="text-neutral-600">
              {locale === defaultLocale
                ? "NightBaseは現場の声をもとに、最も時間を奪うオペレーションを再設計しました。"
                : "NightBase reimagines the most time-consuming workflows from the floor up."}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-soft">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
                {home.beforeAfter.problems.title}
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-neutral-600">
                {home.beforeAfter.problems.bullets.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 shadow-soft">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">
                {home.beforeAfter.solutions.title}
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-[#111111]">
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

      <section className="bg-white py-20">
        <div className="container grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold text-[#111111] sm:text-4xl">{home.uiPreview.title}</h2>
            <p className="text-lg text-neutral-600">{home.uiPreview.description}</p>
            <ul className="space-y-3 text-sm text-neutral-600">
              {home.uiPreview.highlights.map((highlight) => (
                <li key={highlight} className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary/30 text-secondary">
                    •
                  </span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-panel space-y-4 p-6">
            <div className="rounded-2xl border border-neutral-100 bg-white/80 p-6 shadow-soft">
              <p className="text-sm font-semibold text-neutral-500">
                {locale === "ja" ? "今日のKPI" : "Today’s KPIs"}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-neutral-500">
                    {locale === "ja" ? "売上" : "Revenue"}
                  </p>
                  <p className="text-2xl font-semibold text-[#111111]">¥820,000</p>
                  <p className="text-xs text-primary">+12% {locale === "ja" ? "先週比" : "vs last week"}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">
                    {locale === "ja" ? "VIP来店" : "VIP visits"}
                  </p>
                  <p className="text-2xl font-semibold text-[#111111]">38</p>
                  <p className="text-xs text-primary">+6 {locale === "ja" ? "件" : "guests"}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-100 bg-white/80 p-6 shadow-soft">
              <p className="text-sm font-semibold text-neutral-500">
                {locale === "ja" ? "キャストコンディション" : "Cast condition"}
              </p>
              <div className="mt-4 grid gap-3">
                {[
                  { label: locale === "ja" ? "稼働率" : "Shift coverage", value: "98%" },
                  { label: locale === "ja" ? "満足度" : "Engagement", value: "4.8/5" }
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-full bg-neutral-100/60 px-4 py-2">
                    <span className="text-sm text-neutral-500">{item.label}</span>
                    <span className="text-sm font-semibold text-[#111111]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container space-y-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold text-[#111111] sm:text-4xl">{home.forWhom.title}</h2>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            {home.forWhom.segments.map((segment) => (
              <div key={segment.title} className="glass-panel space-y-4 p-8">
                <h3 className="text-2xl font-semibold text-[#111111]">{segment.title}</h3>
                <p className="text-sm text-neutral-500">{segment.description}</p>
                <ul className="space-y-2 text-sm text-neutral-600">
                  {segment.benefits.map((benefit) => (
                    <li key={benefit}>• {benefit}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container space-y-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold text-[#111111] sm:text-4xl">{home.testimonials.title}</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {home.testimonials.items.map((testimonial) => (
              <div key={testimonial.quote} className="glass-panel space-y-4 p-8">
                <p className="text-lg text-[#111111]">“{testimonial.quote}”</p>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/30 text-sm font-semibold text-secondary">
                    {testimonial.avatarInitials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111111]">{testimonial.name}</p>
                    <p className="text-xs text-neutral-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container space-y-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold text-[#111111] sm:text-4xl">
              {dictionary.caseStudies.title}
            </h2>
            <p className="mt-4 text-neutral-600">{dictionary.caseStudies.description}</p>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            {dictionary.caseStudies.items.map((caseStudy) => (
              <CaseStudyCard key={caseStudy.slug} caseStudy={caseStudy} locale={locale} />
            ))}
          </div>
        </div>
      </section>

      <PricingTable
        title={home.pricing.title}
        description={home.pricing.description}
        plans={home.pricing.plans}
        locale={locale}
      />

      <section className="bg-white py-20">
        <div className="container grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="glass-panel space-y-4 p-8">
            <h2 className="text-3xl font-semibold text-[#111111] sm:text-4xl">{home.security.title}</h2>
            <ul className="space-y-3 text-sm text-neutral-600">
              {home.security.bullets.map((bullet) => (
                <li key={bullet}>• {bullet}</li>
              ))}
            </ul>
          </div>
          <div className="glass-panel space-y-4 p-8">
            <h2 className="text-3xl font-semibold text-[#111111] sm:text-4xl">{home.about.title}</h2>
            <p className="text-sm text-neutral-500">{home.about.mission}</p>
            <p className="text-sm text-neutral-500">{home.about.vision}</p>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold text-[#111111] sm:text-4xl">{home.finalCta.title}</h2>
            <p className="text-neutral-600">{home.finalCta.description}</p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href={`/${locale}${home.finalCta.primaryCta.href}`}
                className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary/90"
              >
                {home.finalCta.primaryCta.label}
              </a>
              <a
                href={`/${locale}${home.finalCta.secondaryCta.href}`}
                className="inline-flex items-center rounded-full border border-primary px-6 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
              >
                {home.finalCta.secondaryCta.label}
              </a>
            </div>
          </div>
          <ContactForm dictionary={dictionary.contact} />
        </div>
      </section>
    </div>
  );
}
