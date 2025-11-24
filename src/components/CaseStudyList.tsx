"use client";

import { useMemo, useState } from "react";

import type { CaseStudy } from "@/types/case-studies";
import { formatCaseStudyIndustry } from "@/lib/caseStudies";

import { CaseStudyCard } from "./CaseStudyCard";

interface CaseStudyListProps {
  caseStudies: CaseStudy[];
}

const ALL_CATEGORY = "すべて";
const ALL_TAG = "すべて";

export function CaseStudyList({ caseStudies }: CaseStudyListProps) {
  const [selectedCategory] = useState<string>(ALL_CATEGORY);
  const [selectedTag, setSelectedTag] = useState<string>(ALL_TAG);

  const publishedStudies = useMemo(() => caseStudies, [caseStudies]);

  const { categories, showFilterBar, tags } = useMemo(() => {
    const categorySet = new Set<string>();
    const tagSet = new Set<string>();

    publishedStudies.forEach((study) => {
      const label = formatCaseStudyIndustry(study.industry);
      categorySet.add(label);

      (study.tags ?? []).forEach((tag) => {
        if (typeof tag === "string" && tag.trim().length > 0) {
          tagSet.add(tag.trim());
        }
      });
    });

    const hasTags = tagSet.size > 0;

    return {
      categories: [ALL_CATEGORY, ...Array.from(categorySet)],
      showFilterBar: hasTags && publishedStudies.length > 0,
      tags: Array.from(tagSet),
    };
  }, [publishedStudies]);

  const filteredStudies = useMemo(() => {
    return publishedStudies.filter((study) => {
      const tagOk =
        selectedTag === ALL_TAG || (study.tags ?? []).includes(selectedTag);
      return tagOk;
    });
  }, [publishedStudies, selectedTag]);

  return (
    <section className="space-y-10">
      {showFilterBar && (
        <div className="animate-fade-up">
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:justify-start">
              <button
                type="button"
                onClick={() => setSelectedTag(ALL_TAG)}
                className={
                  "whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition " +
                  (selectedTag === ALL_TAG
                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                    : "bg-primary/10 text-primary hover:bg-primary/15")
                }
              >
                すべてのタグ
              </button>
              {tags.map((tag) => {
                const isActive = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={
                      "whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition " +
                      (isActive
                        ? "bg-primary text-white shadow-sm shadow-primary/30"
                        : "bg-primary/10 text-primary hover:bg-primary/15")
                    }
                    aria-pressed={isActive}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {filteredStudies.length === 0 ? (
        <div className="glass-panel p-12 text-center text-sm text-neutral-500">
          現在公開中の導入事例はありません。
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {filteredStudies.map((caseStudy) => (
            <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} />
          ))}
        </div>
      )}
    </section>
  );
}
