"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { ManualPage } from "@/types/manual";
import { cn } from "@/lib/utils";

type ManualSidebarProps = {
  pages: ManualPage[];
};

const ALL_SECTION = "すべて";

function normalize(text: string | null | undefined) {
  return (text ?? "").toLowerCase();
}

export function ManualSidebar({ pages }: ManualSidebarProps) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>(ALL_SECTION);

  const currentSlug = useMemo(() => {
    if (!pathname) return null;
    const match = pathname.match(/\/manual\/(.+)$/);
    return match?.[1] ?? null;
  }, [pathname]);

  const orderedSections = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];

    for (const page of pages) {
      const key = page.section || "general";
      if (!seen.has(key)) {
        seen.add(key);
        list.push(key);
      }
    }

    return list;
  }, [pages]);

  const searchLower = normalize(search);

  const filteredPages = useMemo(() => {
    const base = pages;

    const searched = !searchLower
      ? base
      : base.filter((page) => {
          const haystack = [page.title, page.body_markdown ?? ""]
            .map((value) => normalize(value))
            .join("\n");
          return haystack.includes(searchLower);
        });

    if (selectedSection === ALL_SECTION) {
      return searched;
    }

    return searched.filter((page) => (page.section || "general") === selectedSection);
  }, [pages, searchLower, selectedSection]);

  return (
    <aside className="hidden lg:block lg:w-72 lg:flex-shrink-0">
      <div className="lg:sticky lg:top-24 lg:space-y-6">
        <div className="glass-panel space-y-4 p-5">
          <div>
            <label
              htmlFor="manual-sidebar-search"
              className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400"
            >
              Search
            </label>
            <input
              id="manual-sidebar-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="キーワードで探す"
              className="mt-2 w-full rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">タグ</p>
            <div className="flex flex-wrap gap-2">
              {[ALL_SECTION, ...orderedSections].map((section) => {
                const isActive = selectedSection === section;
                return (
                  <button
                    key={section}
                    type="button"
                    onClick={() => setSelectedSection(section)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-xs font-medium transition",
                      isActive
                        ? "bg-primary text-white shadow-sm shadow-primary/30"
                        : "bg-white/70 text-neutral-700 hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    {section === ALL_SECTION ? section : section}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="glass-panel space-y-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">マニュアル</p>
          {filteredPages.length === 0 ? (
            <p className="text-xs text-neutral-500">条件に一致するマニュアルがありません。</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {filteredPages.map((page) => {
                const isCurrent = currentSlug === page.slug;
                return (
                  <li key={page.id}>
                    <Link
                      href={`/manual/${page.slug}`}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3 py-2 text-xs transition",
                        isCurrent
                          ? "bg-primary text-white shadow-sm"
                          : "bg-white/70 text-neutral-700 hover:bg-primary/10 hover:text-primary"
                      )}
                    >
                      <span className="line-clamp-2 text-left">{page.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
