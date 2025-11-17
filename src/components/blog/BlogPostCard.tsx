import Link from "next/link";

import type { BlogPost } from "@/types/blog";
import { cn, formatDate } from "@/lib/utils";

interface BlogPostCardProps {
  post: BlogPost;
  className?: string;
}

export function BlogPostCard({ post, className }: BlogPostCardProps) {
  const dateSource = post.published_at ?? post.updated_at ?? post.created_at;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(
        "group block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/40",
        className
      )}
    >
      <article className="flex h-full flex-col justify-between rounded-3xl border border-neutral-100 bg-white p-8 shadow-soft transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {post.category && (
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
                {post.category}
              </span>
            )}
            {dateSource && (
              <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">
                {formatDate(dateSource)}
              </p>
            )}
          </div>
          <h2 className="text-2xl font-semibold leading-snug text-[#111111] transition-colors group-hover:text-primary">
            {post.title}
          </h2>
          {post.excerpt ? (
            <p className="text-sm leading-relaxed text-neutral-600">{post.excerpt}</p>
          ) : (
            <p className="text-sm leading-relaxed text-neutral-500">詳細は記事でご確認ください。</p>
          )}
        </div>
        <div className="mt-8 flex items-center justify-between text-sm font-semibold text-primary">
          <span>続きを読む</span>
          <svg
            aria-hidden
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="transition-transform duration-300 group-hover:translate-x-1"
          >
            <path
              d="M4 8h7m0 0-3-3m3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </article>
    </Link>
  );
}
