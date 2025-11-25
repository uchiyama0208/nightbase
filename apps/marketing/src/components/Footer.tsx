import Image from "next/image";
import Link from "next/link";

import type { FooterContent } from "@/content/types";

interface FooterProps {
  footer: FooterContent;
}

export function Footer({ footer }: FooterProps) {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 pt-16 pb-8">
      <div className="container">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-12">
          <div className="space-y-4">
            <Image
              src="/Nightbase_textlogo_trim.png"
              alt="NightBase ロゴ"
              width={140}
              height={36}
              className="h-8 w-auto opacity-80 grayscale"
            />
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              {footer.description}
            </p>
          </div>

          {footer.links.map((column) => (
            <div key={column.title}>
              <h4 className="font-bold text-slate-700 mb-4">{column.title}</h4>
              <ul className="space-y-2">
                {column.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-slate-500 hover:text-blue-600 transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400">
            {footer.copyright}
          </p>
          <div className="flex gap-6">
            {footer.legal.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
