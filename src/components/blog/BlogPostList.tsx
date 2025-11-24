'use client';

import { useMemo, useState } from "react";

import type { BlogPost } from "@/types/blog";
import { cn } from "@/lib/utils";

import { BlogPostCard } from "./BlogPostCard";

interface BlogPostListProps {
  posts: BlogPost[];
}

const ALL_CATEGORY = "すべて";
const ALL_TAG = "すべて";

export function BlogPostList({ posts }: BlogPostListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY);
  const [selectedTag, setSelectedTag] = useState<string>(ALL_TAG);

  const publishedPosts = useMemo(
    () => posts.filter((post) => post.status === "published" && post.slug.length > 0),
    [posts]
  );

  const { categories, showFilterBar, tags } = useMemo(() => {
    const categorySet = new Set<string>();
    const tagSet = new Set<string>();

    publishedPosts.forEach((post) => {
      if (post.category) {
        categorySet.add(post.category);
      }
      (post.tags ?? []).forEach((tag) => {
        if (typeof tag === "string" && tag.trim().length > 0) {
          tagSet.add(tag.trim());
        }
      });
    });

    const hasCategory = categorySet.size > 0;
    const hasTags = tagSet.size > 0;
    const shouldShowFilter = (hasCategory || hasTags) && publishedPosts.length > 0;

    return {
      categories: [ALL_CATEGORY, ...Array.from(categorySet)],
      showFilterBar: shouldShowFilter,
      tags: Array.from(tagSet),
    };
  }, [publishedPosts]);

  const filteredPosts = useMemo(() => {
    return publishedPosts.filter((post) => {
      const categoryOk =
        selectedCategory === ALL_CATEGORY || post.category === selectedCategory;
      const tagOk =
        selectedTag === ALL_TAG || (post.tags ?? []).includes(selectedTag);
      return categoryOk && tagOk;
    });
  }, [publishedPosts, selectedCategory, selectedTag]);

  return (
    <section className="space-y-10">
      {showFilterBar && (
        <div className="animate-fade-up space-y-3">
          {categories.length > 1 && (
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
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:justify-start">
              <button
                type="button"
                onClick={() => setSelectedTag(ALL_TAG)}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition",
                  selectedTag === ALL_TAG
                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                    : "bg-primary/10 text-primary hover:bg-primary/15"
                )}
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
                    className={cn(
                      "whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition",
                      isActive
                        ? "bg-primary text-white shadow-sm shadow-primary/30"
                        : "bg-primary/10 text-primary hover:bg-primary/15"
                    )}
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
