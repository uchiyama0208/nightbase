import { Hero } from "@/components/Hero";
import { FeaturesSection } from "@/components/FeaturesSection";
import { PricingTable } from "@/components/PricingTable";
import { CaseStudyCard } from "@/components/CaseStudyCard";
import { featureListEn, pricingPlansEn } from "@/lib/content-en";
import { caseStudies, blogPosts, securityHighlights } from "@/lib/content";
import Link from "next/link";

export default function HomePageEn() {
  return (
    <div className="space-y-24 pb-24">
      <Hero
        locale="en"
        headline="Reinvent nightlife operations with data"
        subheadline="Nightlife Operating Cloud"
        description="NightBase unifies your talent, staff, CRM, attendance, payroll, and QR ordering in a single operating system built for nightlife venues."
        primaryCta={{ label: "Book a demo", href: "/en/contact" }}
        secondaryCta={{ label: "Start free trial", href: "/en/pricing" }}
      />
      <FeaturesSection
        title="Everything your venue needs"
        subtitle="Each capability connects seamlessly so owners, managers, and teams can operate in sync."
        features={featureListEn as unknown as { title: string; description: string; icon: string }[]}
      />
      <section className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="section-heading">Trusted by innovators</h2>
          <p className="section-subtitle mt-4">
            NightBase venues see higher VIP repeat rates, faster payroll cycles, and happier teams.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {caseStudies.map((study) => (
            <CaseStudyCard key={study.slug} href={`/en/case-studies/${study.slug}`} title={study.title} industry={study.industry} summary={study.summary} />
          ))}
        </div>
      </section>
      <PricingTable
        title="Pricing"
        subtitle="Every plan includes enterprise security, backups, and concierge onboarding."
        plans={pricingPlansEn as unknown as any[]}
        ctaLabel="Start free trial"
        ctaHref="/en/contact"
      />
      <section className="container">
        <div className="glass-card p-8">
          <h2 className="section-heading">Security</h2>
          <p className="section-subtitle mt-4">
            Built on Supabase, Vercel, and Stripe with SOC2 and ISO27001 alignment to protect sensitive data.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {securityHighlights.map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-white/60">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container">
        <div className="glass-card p-10 text-center">
          <h2 className="section-heading">Insights</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {blogPosts.map((post) => (
              <div key={post.slug} className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">{post.date}</p>
                <h3 className="mt-3 text-lg font-semibold text-white">{post.title}</h3>
                <p className="mt-3 text-sm text-white/60">{post.excerpt}</p>
                <Link href={`/en/blog/${post.slug}`} className="mt-4 inline-flex text-sm font-semibold text-accent">
                  Read more →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container">
        <div className="glass-card p-10 text-center">
          <h2 className="section-heading">Ready to modernize your venue?</h2>
          <p className="section-subtitle mt-4">
            Our team will tailor a rollout playbook for your bar, lounge, or club.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/en/contact"
              className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-night shadow-glow-accent transition hover:bg-accent/90"
            >
              Talk to us
            </Link>
            <Link
              href="/en/features"
              className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-accent/60 hover:text-accent"
            >
              Explore features
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
