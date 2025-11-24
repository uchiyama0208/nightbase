import { PricingTable } from "@/components/PricingTable";
import { AuroraPage } from "@/components/layouts/AuroraPage";
import { siteContent } from "@/content/site";

export default function PricingPage() {
  const { pricing } = siteContent;

  return (
    <AuroraPage variant="violet" containerClassName="space-y-16">
      <div className="mx-auto max-w-3xl space-y-6 text-center">
        <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">{pricing.title}</h1>
        <p className="text-lg text-neutral-600">{pricing.description}</p>
      </div>
      <PricingTable title={pricing.title} description={pricing.description} plans={pricing.plans} />
      <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-[#0f172a]">FAQ</h2>
          <div className="space-y-4">
            {pricing.faq.map((item) => (
              <div key={item.question} className="glass-panel space-y-2 p-6 text-left">
                <p className="text-sm font-semibold text-[#0f172a]">{item.question}</p>
                <p className="text-sm text-neutral-500">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel space-y-4 p-8">
          <h2 className="text-2xl font-semibold text-[#0f172a]">{pricing.cta.title}</h2>
          <p className="text-sm text-neutral-500">{pricing.cta.description}</p>
          <a href={pricing.cta.href} className="glass-button bg-primary text-white hover:text-white">
            {pricing.cta.action}
          </a>
        </div>
      </div>
    </AuroraPage>
  );
}
