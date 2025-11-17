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
    () => posts.filter((post) => post.status === "published"),
    [posts]
  );

  const categories = useMemo(() => {
    const unique = new Set<string>();

    publishedPosts.forEach((post) => {
      if (post.category) {
        unique.add(post.category);
      }
    });

    return [ALL_CATEGORY, ...Array.from(unique)];
  }, [publishedPosts]);

  const filteredPosts = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY) {
      return publishedPosts;
    }

    return publishedPosts.filter((post) => post.category === selectedCategory);
  }, [publishedPosts, selectedCategory]);

  const showFilterBar = categories.length > 1;

  return (
    <section className="space-y-8">
      {showFilterBar && (
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-neutral-100 bg-white px-4 py-3 shadow-soft sm:justify-start">
          {categories.map((category) => {
            const isActive = selectedCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-5 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  isActive
                    ? "border-primary bg-primary text-white shadow-lg shadow-primary/20"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-primary/40 hover:text-primary"
                )}
                aria-pressed={isActive}
              >
                {category}
              </button>
            );
          })}
        </div>
      )}

      {publishedPosts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-200 bg-white p-12 text-center shadow-soft">
          <p className="text-base font-medium text-neutral-500">現在公開中のブログ記事はありません。</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-200 bg-white p-12 text-center shadow-soft">
          <p className="text-base font-medium text-neutral-500">選択したカテゴリに該当する記事はまだありません。</p>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {filteredPosts.map((post) => (
            <BlogPostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}
