"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { ManualPage } from "@/types/manual";

type ManualListProps = {
  pages: ManualPage[];
};

const ALL_CATEGORY = "すべて";

function normalize(text: string | null | undefined) {
  return (text ?? "").toLowerCase();
}

export function ManualList({ pages }: ManualListProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY);

  const orderedCategories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];

    for (const page of pages) {
      if (!seen.has(page.category)) {
        seen.add(page.category);
        list.push(page.category);
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
        page.summary ?? "",
        page.body_markdown.slice(0, 600),
      ]
        .map((value) => normalize(value))
        .join("\n");

      return haystack.includes(searchLower);
    });
  }, [pages, searchLower]);

  const filteredPages = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY) {
      return searchedPages;
    }

    return searchedPages.filter((page) => page.category === selectedCategory);
  }, [searchedPages, selectedCategory]);

  const groupedByCategory = useMemo(() => {
    return filteredPages.reduce<Record<string, ManualPage[]>>((acc, page) => {
      if (!acc[page.category]) {
        acc[page.category] = [];
      }

      acc[page.category].push(page);
      return acc;
    }, {});
  }, [filteredPages]);

  const categoriesToRender = selectedCategory === ALL_CATEGORY
    ? orderedCategories
    : orderedCategories.filter((category) => category === selectedCategory);

  return (
    <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
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
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
            Categories
          </p>
          <div className="flex flex-wrap gap-2">
            {[ALL_CATEGORY, ...orderedCategories].map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                  selectedCategory === category
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-primary/40 hover:text-primary"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </aside>
      <div className="space-y-12">
        {categoriesToRender.map((category) => {
          const pagesInCategory = groupedByCategory[category] ?? [];

          if (pagesInCategory.length === 0) {
            return null;
          }

          return (
            <section key={category} className="space-y-6">
              <header className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                  {category}
                </p>
                <h2 className="text-2xl font-semibold text-[#111111]">
                  {category} のマニュアル
                </h2>
              </header>
              <div className="grid gap-6 md:grid-cols-2">
                {pagesInCategory.map((page) => (
                  <article
                    key={page.id}
                    className="flex h-full flex-col justify-between rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-[#111111]">
                        {page.title}
                      </h3>
                      {page.summary ? (
                        <p className="text-sm text-neutral-600">{page.summary}</p>
                      ) : null}
                    </div>
                    <div className="pt-6">
                      <Link
                        href={`/manual/${page.slug}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
                      >
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
          <div className="rounded-3xl border border-dashed border-neutral-200 bg-white p-12 text-center text-sm text-neutral-500">
            条件に一致するマニュアルが見つかりませんでした。
          </div>
        ) : null}
      </div>
    </div>
  );
}
