"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { NavItem } from "@/lib/navigation";

interface NavbarProps {
  items: NavItem[];
  ctaLabel: string;
  ctaHref: string;
  localeSwitcher?: { label: string; href: string }[];
  homeHref?: string;
}

export function Navbar({ items, ctaHref, ctaLabel, localeSwitcher = [], homeHref = "/" }: NavbarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
      <div className="container flex items-center justify-between py-4">
        <Link href={homeHref} className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shadow-[0_0_0_1px_rgba(0,136,255,0.15)]">
            NB
          </span>
          <span>NightBase</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === item.href ? "text-primary" : "text-slate-600"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-4 md:flex">
          {localeSwitcher.map((locale) => (
            <Link key={locale.href} href={locale.href} className="text-sm text-slate-600 hover:text-primary">
              {locale.label}
            </Link>
          ))}
          <Link
            href={ctaHref}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,136,255,0.25)] transition hover:bg-primary/90"
          >
            {ctaLabel}
          </Link>
        </div>
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-600 md:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-slate-200 bg-white/95 backdrop-blur-xl md:hidden"
          >
            <div className="container flex flex-col space-y-4 py-6">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname === item.href ? "text-primary" : "text-slate-600"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex items-center gap-3">
                {localeSwitcher.map((locale) => (
                  <Link
                    key={locale.href}
                    href={locale.href}
                    className="text-xs uppercase text-slate-500 hover:text-primary"
                    onClick={() => setOpen(false)}
                  >
                    {locale.label}
                  </Link>
                ))}
              </div>
              <Link
                href={ctaHref}
                className="rounded-full bg-primary px-4 py-2 text-center text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,136,255,0.25)] transition hover:bg-primary/90"
                onClick={() => setOpen(false)}
              >
                {ctaLabel}
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
