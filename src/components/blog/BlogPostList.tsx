import type { BlogPost } from "@/types/blog";

import { BlogPostCard } from "./BlogPostCard";

interface BlogPostListProps {
  posts: BlogPost[];
}

export function BlogPostList({ posts }: BlogPostListProps) {
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
    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
      {posts.map((post) => (
        <BlogPostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
