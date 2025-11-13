import { notFound } from "next/navigation";

import { ContactForm } from "@/components/ContactForm";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export default async function ContactPage({
  params
}: {
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  if (!locales.includes(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale);

  return (
    <div className="bg-white py-20">
      <div className="container grid gap-10 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{dictionary.contact.title}</h1>
          <p className="text-lg text-neutral-600">{dictionary.contact.description}</p>
          <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold text-[#111111]">
              {locale === "ja" ? "サポート内容" : "What’s included"}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-neutral-600">
              <li>• {locale === "ja" ? "無料オンラインデモ" : "Complimentary online demo"}</li>
              <li>• {locale === "ja" ? "導入シミュレーション" : "Rollout planning"}</li>
              <li>• {locale === "ja" ? "価格・機能のご案内" : "Pricing & feature walkthrough"}</li>
            </ul>
          </div>
        </div>
        <ContactForm dictionary={dictionary.contact} />
      </div>
    </div>
  );
}
