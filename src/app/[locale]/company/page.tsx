import { notFound } from "next/navigation";

import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export default async function CompanyPage({
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
  const company = dictionary.legal.company;

  return (
    <div className="bg-white py-20">
      <div className="container mx-auto max-w-3xl space-y-6">
        <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{company.title}</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          {company.facts.map((fact) => (
            <div key={fact.label} className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-soft">
              <p className="text-xs text-neutral-500">{fact.label}</p>
              <p className="mt-2 text-lg font-semibold text-[#111111]">{fact.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
