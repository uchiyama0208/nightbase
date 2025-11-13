import Link from "next/link";

import type { FooterDictionary } from "@/lib/i18n/types";

interface FooterProps {
  dictionary: FooterDictionary;
  locale: string;
}

export function Footer({ dictionary, locale }: FooterProps) {
  const buildHref = (href: string) => {
    if (href === "/") return `/${locale}`;
    return `/${locale}${href}`;
  };

  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="container grid gap-12 py-16 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-soft">
              NB
            </div>
            <div>
              <p className="text-lg font-semibold">NightBase</p>
              <p className="text-sm text-neutral-500">{dictionary.description}</p>
            </div>
          </div>
          <div className="space-y-3 rounded-3xl border border-neutral-100 bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold text-[#111111]">{dictionary.cta.title}</p>
            <p className="text-sm text-neutral-500">{dictionary.cta.description}</p>
            <Link
              href={buildHref(dictionary.cta.href)}
              className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80"
            >
              {dictionary.cta.action}
            </Link>
          </div>
        </div>
        {dictionary.links.map((column) => (
          <div key={column.title} className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {column.title}
            </p>
            <ul className="space-y-3 text-sm text-neutral-500">
              {column.items.map((item) => (
                <li key={item.href}>
                  <Link href={buildHref(item.href)} className="hover:text-[#111111]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-neutral-100">
        <div className="container flex flex-col gap-4 py-6 text-sm text-neutral-500 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            {dictionary.legal.map((item) => (
              <Link key={item.href} href={buildHref(item.href)} className="hover:text-[#111111]">
                {item.label}
              </Link>
            ))}
          </div>
          <p>{dictionary.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
