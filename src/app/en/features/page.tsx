import { FeaturesSection } from "@/components/FeaturesSection";
import { featureListEn } from "@/lib/content-en";
import Link from "next/link";

export const metadata = {
  title: "Features | NightBase",
  description: "Discover how NightBase unifies operations for nightlife venues."
};

export default function FeaturesPageEn() {
  return (
    <div className="space-y-16 pb-24">
      <section className="container pt-16">
        <div className="glass-card p-10 text-center">
          <h1 className="section-heading">NightBase Features</h1>
          <p className="section-subtitle mt-4">
            Every workflow, from staffing to guest experience, runs on a single secure platform.
          </p>
        </div>
      </section>
      <FeaturesSection
        title="Run your venue end-to-end"
        subtitle="Purpose-built modules for nightlife operators."
        features={featureListEn as unknown as { title: string; description: string; icon: string }[]}
      />
      <section className="container">
        <div className="glass-card p-8">
          <h2 className="section-heading">Dive deeper</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              { href: "/en/features/dashboard", label: "Operations dashboard" },
              { href: "/en/features/attendance", label: "Attendance & payroll" },
              { href: "/en/features/order", label: "QR ordering" },
              { href: "/en/features/crm", label: "Customer CRM" },
              { href: "/en/features/payroll", label: "Enterprise payroll" }
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-3xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-white transition hover:border-accent/60 hover:text-accent"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
