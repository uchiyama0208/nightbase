"use client";

import Link from "next/link";
import { useState } from "react";

const navigation = [
  { name: "製品", href: "#features" },
  { name: "料金", href: "#pricing" },
  { name: "導入事例", href: "#case-studies" },
  { name: "ブログ", href: "/blog" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="text-xl font-semibold tracking-tight text-white">
          Nightbase
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-200 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="transition hover:text-white/90"
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/blog"
            className="text-sm font-semibold text-slate-200 transition hover:text-white"
          >
            リソースを見る
          </Link>
          <Link
            href="#cta"
            className="rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
          >
            無料で始める
          </Link>
        </div>
        <button
          type="button"
          aria-label="Toggle navigation"
          className="inline-flex items-center justify-center rounded-md p-2 text-slate-200 transition hover:bg-white/10 md:hidden"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
          >
            {isOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>
      {isOpen ? (
        <div className="border-t border-white/10 bg-slate-950/90 px-6 pb-6 md:hidden">
          <nav className="flex flex-col gap-4 pt-4 text-sm font-medium text-slate-200">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="transition hover:text-white/90"
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <Link
              href="#cta"
              className="rounded-full bg-indigo-500 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
              onClick={() => setIsOpen(false)}
            >
              無料で始める
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
