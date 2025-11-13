import Image from "next/image";
import Link from "next/link";

import type { FooterContent } from "@/content/types";

interface FooterProps {
  footer: FooterContent;
}

export function Footer({ footer }: FooterProps) {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="container grid gap-12 py-16 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="space-y-6">
          <div className="space-y-4">
            <Image
              src="/Nightbase_textlogo_trim.png"
              alt="NightBase ロゴ"
              width={152}
              height={40}
              className="h-9 w-auto"
            />
            <p className="text-sm text-neutral-500">{footer.description}</p>
          </div>
          <div className="space-y-3 rounded-3xl border border-neutral-100 bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold text-[#111111]">{footer.cta.title}</p>
            <p className="text-sm text-neutral-500">{footer.cta.description}</p>
            <Link href={footer.cta.href} className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80">
              {footer.cta.action}
            </Link>
          </div>
        </div>
        {footer.links.map((column) => (
          <div key={column.title} className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{column.title}</p>
            <ul className="space-y-3 text-sm text-neutral-500">
              {column.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-[#111111]">
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
            {footer.legal.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-[#111111]">
                {item.label}
              </Link>
            ))}
          </div>
          <p>{footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
