'use client';

import { useMemo, useState } from "react";

import type { BlogPost } from "@/types/blog";
import { cn } from "@/lib/utils";

import { BlogPostCard } from "./BlogPostCard";

interface BlogPostListProps {
  posts: BlogPost[];
}

const ALL_CATEGORY = "すべて";

export function BlogPostList({ posts }: BlogPostListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY);

  const publishedPosts = useMemo(
    () => posts.filter((post) => post.status === "published" && post.slug.length > 0),
    [posts]
  );

  const { categories, showFilterBar } = useMemo(() => {
    const unique = new Set<string>();

    publishedPosts.forEach((post) => {
      if (post.category) {
        unique.add(post.category);
      }
    });

    const shouldShowFilter = unique.size > 1 && publishedPosts.length > 1;

    return {
      categories: [ALL_CATEGORY, ...Array.from(unique)],
      showFilterBar: shouldShowFilter,
    };
  }, [publishedPosts]);

  const filteredPosts = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY) {
      return publishedPosts;
    }

    return publishedPosts.filter((post) => post.category === selectedCategory);
  }, [publishedPosts, selectedCategory]);

  return (
    <section className="space-y-10">
      {showFilterBar && (
        <div className="glass-panel animate-fade-up p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            {categories.map((category) => {
              const isActive = selectedCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/40",
                    isActive
                      ? "bg-primary text-white shadow-lg shadow-primary/30"
                      : "border border-white/60 bg-white/50 text-neutral-600 hover:border-primary/40 hover:text-primary"
                  )}
                  aria-pressed={isActive}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {publishedPosts.length === 0 ? (
        <div className="glass-panel p-12 text-center text-base font-medium text-neutral-500">
          現在公開中のブログ記事はありません。
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="glass-panel p-12 text-center text-base font-medium text-neutral-500">
          選択したカテゴリに該当する記事はまだありません。
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {filteredPosts.map((post, index) => (
            <BlogPostCard key={post.id} post={post} className="motion-safe:animate-fade-up" style={{ animationDelay: `${index * 60}ms` }} />
          ))}
        </div>
      )}
    </section>
  );
}
