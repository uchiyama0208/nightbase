import { notFound } from "next/navigation";

import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export default async function PrivacyPolicyPage({
  params
}: {
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  if (!locales.includes(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale);
  const privacy = dictionary.legal.privacy;

  return (
    <div className="bg-white py-20">
      <div className="container mx-auto max-w-3xl space-y-6">
        <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{privacy.title}</h1>
        <div className="space-y-4 text-sm text-neutral-600">
          {privacy.content.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
