"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { NavigationContent } from "@/content/types";
import { cn } from "@/lib/utils";

interface NavbarProps {
  navigation: NavigationContent;
}

export function Navbar({ navigation }: NavbarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3 text-sm" onClick={() => setOpen(false)}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-soft">
            NB
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-tight">NightBase</span>
            <span className="text-xs text-neutral-500">{navigation.brandTagline}</span>
          </div>
        </Link>
        <nav className="hidden items-center gap-10 md:flex">
          {navigation.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
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
          <Button asChild>
            <Link href="/contact">{navigation.cta}</Link>
          </Button>
        </div>
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 md:hidden"
          aria-expanded={open}
          aria-label="メニューを開閉"
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
          {navigation.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
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
        <Button asChild className="mt-6 w-full">
          <Link href="/contact" onClick={() => setOpen(false)}>
            {navigation.cta}
          </Link>
        </Button>
      </div>
    </header>
  );
}
