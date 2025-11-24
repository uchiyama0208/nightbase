"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { ManualPage } from "@/types/manual";

type ManualListProps = {
  pages: ManualPage[];
};

const ALL_SECTION = "すべて";

function normalize(text: string | null | undefined) {
  return (text ?? "").toLowerCase();
}

function humanizeSection(section: string) {
  return section
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ManualList({ pages }: ManualListProps) {
  const [search, setSearch] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>(ALL_SECTION);

  const orderedSections = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];

    for (const page of pages) {
      if (!seen.has(page.section)) {
        seen.add(page.section);
        list.push(page.section);
      }
    }

    return list;
  }, [pages]);

  const searchLower = normalize(search);

  const searchedPages = useMemo(() => {
    if (!searchLower) {
      return pages;
    }

    return pages.filter((page) => {
      const haystack = [
        page.title,
        page.body_markdown?.slice(0, 600) ?? "",
      ]
        .map((value) => normalize(value))
        .join("\n");

      return haystack.includes(searchLower);
    });
  }, [pages, searchLower]);

  const filteredPages = useMemo(() => {
    if (selectedSection === ALL_SECTION) {
      return searchedPages;
    }

    return searchedPages.filter((page) => page.section === selectedSection);
  }, [searchedPages, selectedSection]);

  const groupedBySection = useMemo(() => {
    return filteredPages.reduce<Record<string, ManualPage[]>>((acc, page) => {
      const key = page.section;
      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(page);
      return acc;
    }, {});
  }, [filteredPages]);

  const sectionsToRender = selectedSection === ALL_SECTION
    ? orderedSections.filter((section) => (groupedBySection[section] ?? []).length > 0)
    : orderedSections.filter((section) => section === selectedSection);

  return (
    <div className="grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="glass-panel lg:sticky lg:top-28">
        <div className="space-y-4">
          <div>
            <label htmlFor="manual-search" className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
              Search
            </label>
            <input
              id="manual-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="キーワードで探す"
              className="mt-2 w-full rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">セクション</p>
            <div className="flex flex-wrap gap-2">
              {[ALL_SECTION, ...orderedSections].map((section) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => setSelectedSection(section)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    selectedSection === section
                      ? "bg-primary text-white shadow-lg shadow-primary/30"
                      : "border border-white/40 bg-white/40 text-neutral-600 hover:border-primary/40 hover:text-primary"
                  )}
                >
                  {section === ALL_SECTION ? section : humanizeSection(section)}
                </button>
              ))}
            </div>
          </div>
          <p className="rounded-2xl bg-white/40 p-4 text-xs text-neutral-500">
            検索キーワードとセクションを組み合わせて、必要なマニュアルをすぐに探せます。
          </p>
        </div>
      </aside>
      <div className="space-y-12">
        {sectionsToRender.map((section) => {
          const pagesInSection = groupedBySection[section] ?? [];

          if (pagesInSection.length === 0) {
            return null;
          }

          return (
            <section key={section} className="space-y-6">
              <header className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                  {section === ALL_SECTION ? section : humanizeSection(section)}
                </p>
                <h2 className="text-2xl font-semibold text-[#111111]">
                  {section === ALL_SECTION ? "全カテゴリのマニュアル" : `${humanizeSection(section)} のマニュアル`}
                </h2>
              </header>
              <div className="grid gap-6 md:grid-cols-2">
                {pagesInSection.map((page) => (
                  <article
                    key={page.id}
                    className="glass-panel hover-lift flex h-full flex-col justify-between p-6"
                  >
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">
                        {humanizeSection(page.section)}
                      </p>
                      <h3 className="text-xl font-semibold text-[#111111]">{page.title}</h3>
                      <p className="text-sm text-neutral-600">
                        {page.body_markdown
                          ? `${page.body_markdown.slice(0, 120)}${page.body_markdown.length > 120 ? "…" : ""}`
                          : "詳細はページでご確認ください。"}
                      </p>
                    </div>
                    <div className="pt-6">
                      <Link href={`/manual/${page.slug}`} className="glass-button">
                        詳しく読む
                        <svg
                          aria-hidden
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M6.5 4.5 9.5 7.5 6.5 10.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
        {filteredPages.length === 0 ? (
          <div className="glass-panel p-12 text-center text-sm text-neutral-500">
            条件に一致するマニュアルが見つかりませんでした。
          </div>
        ) : null}
      </div>
    </div>
  );
}
