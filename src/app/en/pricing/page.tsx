import { PricingTable } from "@/components/PricingTable";
import { pricingPlansEn } from "@/lib/content-en";

export const metadata = {
  title: "Pricing | NightBase",
  description: "Compare NightBase plans for nightlife venues."
};

export default function PricingPageEn() {
  return (
    <div className="pb-24">
      <section className="container pt-20">
        <div className="glass-card p-10 text-center">
          <h1 className="section-heading">Pricing</h1>
          <p className="section-subtitle mt-4">
            Choose the right plan for your venue. Trials include concierge onboarding and data migration support.
          </p>
        </div>
      </section>
      <PricingTable
        title="Compare plans"
        subtitle="Enterprise-grade security, backups, and support on every tier."
        plans={pricingPlansEn as unknown as any[]}
        ctaLabel="Start free trial"
        ctaHref="/en/contact"
      />
    </div>
  );
}
