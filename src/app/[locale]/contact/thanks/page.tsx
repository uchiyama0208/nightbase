import Link from "next/link";
import { notFound } from "next/navigation";

import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export default async function ContactThanksPage({
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
  const thanks = dictionary.contactThanks;

  return (
    <div className="bg-white py-20">
      <div className="container mx-auto max-w-2xl space-y-6 text-center">
        <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{thanks.title}</h1>
        <p className="text-lg text-neutral-600">{thanks.description}</p>
        <Link
          href={`/${locale}${thanks.actionHref}`}
          className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary/90"
        >
          {thanks.actionLabel}
        </Link>
      </div>
    </div>
  );
}
