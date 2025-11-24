import { PricingTable } from "@/components/PricingTable";
import { siteContent } from "@/content/site";

export default function PricingPage() {
  const { pricing } = siteContent;

  return (
    <div className="bg-white py-20">
      <div className="container mx-auto max-w-3xl space-y-6 text-center">
        <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{pricing.title}</h1>
        <p className="text-lg text-neutral-600">{pricing.description}</p>
      </div>
      <PricingTable title={pricing.title} description={pricing.description} plans={pricing.plans} />
      <div className="container mt-16 grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-[#111111]">FAQ</h2>
          <div className="space-y-4">
            {pricing.faq.map((item) => (
              <div key={item.question} className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-soft">
                <p className="text-sm font-semibold text-[#111111]">{item.question}</p>
                <p className="mt-2 text-sm text-neutral-500">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel space-y-4 p-8">
          <h2 className="text-2xl font-semibold text-[#111111]">{pricing.cta.title}</h2>
          <p className="text-sm text-neutral-500">{pricing.cta.description}</p>
          <a
            href={pricing.cta.href}
            className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary/90"
          >
            {pricing.cta.action}
          </a>
        </div>
      </div>
    </div>
  );
}
