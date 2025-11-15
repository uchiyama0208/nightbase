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

  const categories = useMemo(() => {
    const unique = new Set<string>();

    posts.forEach((post) => {
      if (post.category) {
        unique.add(post.category);
      }
    });

    return [ALL_CATEGORY, ...Array.from(unique)];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY) {
      return posts;
    }

    return posts.filter((post) => post.category === selectedCategory);
  }, [posts, selectedCategory]);

  if (posts.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-neutral-200 bg-white p-12 text-center shadow-soft">
        <p className="text-base font-medium text-neutral-500">
          公開準備中のコンテンツです。最新の記事はまもなく公開予定です。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="-mx-6 overflow-x-auto pb-2 md:mx-0 md:pb-0">
        <div className="flex w-max items-center gap-3 px-6 md:w-full md:flex-wrap md:justify-center md:px-0">
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
      </div>

      {filteredPosts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-200 bg-white p-12 text-center shadow-soft">
          <p className="text-base font-medium text-neutral-500">
            選択したカテゴリに該当する記事はまだありません。
          </p>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {filteredPosts.map((post) => (
            <BlogPostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
