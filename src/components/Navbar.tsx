"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { NavigationDictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

interface NavbarProps {
  dictionary: NavigationDictionary;
  locale: Locale;
}

export function Navbar({ dictionary, locale }: NavbarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const buildHref = (href: string) => {
    if (href === "/") {
      return `/${locale}`;
    }
    return `/${locale}${href}`;
  };

  const isActive = (href: string) => {
    const target = buildHref(href);
    if (!pathname) return false;
    if (target === `/${locale}`) {
      return pathname === target;
    }
    return pathname.startsWith(target);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link href={`/${locale}`} className="flex items-center gap-3 text-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-soft">
            NB
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-tight">NightBase</span>
            <span className="text-xs text-neutral-500">{dictionary.brandTagline}</span>
          </div>
        </Link>
        <nav className="hidden items-center gap-10 md:flex">
          {dictionary.links.map((link) => (
            <Link
              key={link.href}
              href={buildHref(link.href)}
              className={cn(
                "text-sm font-medium text-neutral-500 transition-colors hover:text-[#111111]",
                isActive(link.href) && "text-[#111111]"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-4 md:flex">
          <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-500">
            <span>{dictionary.localeSwitcherLabel}</span>
            <div className="flex items-center gap-2">
              {Object.entries(dictionary.localeNames).map(([key, label]) => (
                <Link
                  key={key}
                  href={key === "ja" ? "/ja" : "/en"}
                  className={cn(
                    "rounded-full px-2 py-1 transition-colors",
                    key === locale ? "bg-primary text-white" : "text-neutral-500 hover:bg-neutral-100"
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <Button asChild>
            <Link href={buildHref("/contact")}>{dictionary.cta}</Link>
          </Button>
        </div>
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 md:hidden"
          aria-expanded={open}
          aria-label="Toggle navigation"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      <div
        className={cn(
          "border-t border-neutral-100 bg-white px-6 py-6 transition-all md:hidden",
          open ? "max-h-[500px] opacity-100" : "max-h-0 overflow-hidden opacity-0"
        )}
      >
        <nav className="flex flex-col gap-4">
          {dictionary.links.map((link) => (
            <Link
              key={link.href}
              href={buildHref(link.href)}
              onClick={() => setOpen(false)}
              className={cn(
                "text-base font-medium text-neutral-600",
                isActive(link.href) && "text-primary"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {Object.entries(dictionary.localeNames).map(([key, label]) => (
            <Link
              key={key}
              href={key === "ja" ? "/ja" : "/en"}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                key === locale ? "border-primary bg-primary text-white" : "border-neutral-200 text-neutral-500"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
        <Button asChild className="mt-6 w-full">
          <Link href={buildHref("/contact")} onClick={() => setOpen(false)}>
            {dictionary.cta}
          </Link>
        </Button>
      </div>
    </header>
  );
}
