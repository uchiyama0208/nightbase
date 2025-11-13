import { notFound } from "next/navigation";

import { PricingTable } from "@/components/PricingTable";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export default async function PricingPage({
  params
}: {
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  if (!locales.includes(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale);
  const pricing = dictionary.pricing;

  return (
    <div className="bg-white py-20">
      <div className="container mx-auto max-w-3xl space-y-6 text-center">
        <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{pricing.title}</h1>
        <p className="text-lg text-neutral-600">{pricing.description}</p>
      </div>
      <PricingTable
        title={pricing.title}
        description={pricing.description}
        plans={pricing.plans}
        locale={locale}
      />
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
            href={`/${locale}${pricing.cta.href}`}
            className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary/90"
          >
            {pricing.cta.action}
          </a>
        </div>
      </div>
    </div>
  );
}
