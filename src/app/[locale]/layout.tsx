import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  if (!locales.includes(locale)) {
    return {};
  }
  const dictionary = await getDictionary(locale);
  return {
    title: dictionary.metadata.title,
    description: dictionary.metadata.description,
    alternates: {
      canonical: locale === defaultLocale ? `/${locale}` : `/${locale}`,
      languages: Object.fromEntries(locales.map((lang) => [lang, `/${lang}`]))
    },
    openGraph: {
      title: dictionary.metadata.title,
      description: dictionary.metadata.description,
      url: locale === defaultLocale ? `https://nightbase.example/${locale}` : `https://nightbase.example/${locale}`,
      siteName: "NightBase",
      locale,
      type: "website"
    }
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;

  if (!locales.includes(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar dictionary={dictionary.navigation} locale={locale} />
      <main className="flex-1">{children}</main>
      <Footer dictionary={dictionary.footer} locale={locale} />
    </div>
  );
}
