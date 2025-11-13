import { notFound } from "next/navigation";

import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export default async function SecurityPage({
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
  const security = dictionary.security;

  return (
    <div className="bg-white py-20">
      <div className="container space-y-12">
        <header className="mx-auto max-w-3xl space-y-4 text-center">
          <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{security.title}</h1>
          <p className="text-lg text-neutral-600">{security.description}</p>
        </header>
        <section className="grid gap-8 lg:grid-cols-3">
          {security.pillars.map((pillar) => (
            <div key={pillar.title} className="glass-panel space-y-4 p-8">
              <h2 className="text-2xl font-semibold text-[#111111]">{pillar.title}</h2>
              <ul className="space-y-2 text-sm text-neutral-600">
                {pillar.items.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
        <section className="glass-panel space-y-4 p-8">
          <h2 className="text-2xl font-semibold text-[#111111]">{security.compliance.title}</h2>
          <ul className="space-y-2 text-sm text-neutral-600">
            {security.compliance.items.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
