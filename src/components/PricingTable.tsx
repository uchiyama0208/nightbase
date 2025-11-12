import { motion } from "framer-motion";

interface PricingFeature {
  name: string;
  price: string;
  description: string;
  highlight: string;
  features: string[];
  featured?: boolean;
}

interface PricingTableProps {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  plans: PricingFeature[];
}

export function PricingTable({ title, subtitle, ctaHref, ctaLabel, plans }: PricingTableProps) {
  return (
    <section className="container py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="section-heading">{title}</h2>
        <p className="section-subtitle mt-4">{subtitle}</p>
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: index * 0.05 }}
            className={`relative flex h-full flex-col justify-between rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-glass backdrop-blur-xl ${
              plan.featured ? "ring-1 ring-accent/40" : ""
            }`}
          >
            {plan.featured ? (
              <span className="absolute right-6 top-6 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent">
                {plan.highlight}
              </span>
            ) : (
              <span className="text-xs uppercase tracking-[0.4em] text-white/40">{plan.highlight}</span>
            )}
            <div className="mt-6 space-y-3">
              <h3 className="text-2xl font-semibold text-white">{plan.name}</h3>
              <p className="text-3xl font-bold text-accent">{plan.price}</p>
              <p className="text-sm text-white/60">{plan.description}</p>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-white/70">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <a
              href={ctaHref}
              className={`mt-10 inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold transition ${
                plan.featured
                  ? "border-transparent bg-accent text-night shadow-glow-accent hover:bg-accent/90"
                  : "border-white/20 bg-white/5 text-white hover:border-accent/40 hover:text-accent"
              }`}
            >
              {ctaLabel}
            </a>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
