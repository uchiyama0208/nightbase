"use client";

import { useState } from "react";
import Image from "next/image";
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
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="container px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between gap-5">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3"
          >
            <Image
              src="/Nightbase_textlogo_trim.png"
              alt="NightBase ロゴ"
              width={140}
              height={36}
              priority
              className="h-7 w-auto md:h-8"
            />
            <span className="hidden text-xs font-medium text-slate-400 lg:inline pt-1">{navigation.brandTagline}</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {navigation.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-blue-600",
                  isActive(link.href) ? "text-blue-600" : "text-slate-600"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <Button asChild className="rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 px-6">
              <Link href="/contact">{navigation.cta}</Link>
            </Button>
          </div>

          <button
            onClick={() => setOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 lg:hidden text-slate-600"
            aria-expanded={open}
            aria-label="メニューを開閉"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <div
          className={cn(
            "absolute top-16 left-0 w-full bg-white border-b border-slate-100 shadow-lg transition-all duration-300 ease-in-out lg:hidden overflow-hidden",
            open ? "max-h-[calc(100vh-4rem)] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <nav className="flex flex-col p-6 gap-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
            {navigation.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "text-lg font-medium py-2 border-b border-slate-50",
                  isActive(link.href) ? "text-blue-600" : "text-slate-600"
                )}
              >
                {link.label}
              </Link>
            ))}
            <Button asChild className="mt-4 w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base">
              <Link href="/contact" onClick={() => setOpen(false)}>
                {navigation.cta}
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Mobile Bottom CTA */}
      {!pathname?.startsWith("/login") && !pathname?.startsWith("/signup") && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 p-4 lg:hidden shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] flex items-center justify-between gap-4 safe-area-bottom">
          <span className="text-xs font-bold text-slate-500 pl-2">まずは無料で相談</span>
          <Button asChild className="flex-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20">
            <Link href="/contact">デモを予約</Link>
          </Button>
        </div>
      )}
    </>
  );
}
