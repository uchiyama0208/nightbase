import Link from "next/link";
import type { CSSProperties } from "react";

import type { BlogPost } from "@/types/blog";
import { cn, formatDate } from "@/lib/utils";

interface BlogPostCardProps {
  post: BlogPost;
  className?: string;
  style?: CSSProperties;
}

export function BlogPostCard({ post, className, style }: BlogPostCardProps) {
  const dateSource = post.published_at;
  const primaryCategory = post.tags && post.tags.length > 0 ? post.tags[0] : null;
  const coverImageUrl = post.cover_image_url ?? "";

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(
        "group block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/40",
        className
      )}
      style={style}
    >
      <article className="glass-panel hover-lift flex h-full flex-col justify-between gap-6 p-8">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
            {primaryCategory && (
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] text-primary">
                {primaryCategory}
              </span>
            )}
            {dateSource && <span>{formatDate(dateSource)}</span>}
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold leading-snug text-[#0f172a] transition-colors group-hover:text-primary">
              {post.title}
            </h2>
            <p className="text-sm leading-relaxed text-neutral-600">
              {post.excerpt ?? "NightBase チームの視点で、ナイトワークDXの最新情報をお届けします。"}
            </p>
          </div>
          {coverImageUrl ? (
            <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-neutral-100">
              <div className="aspect-[16/9] w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImageUrl}
                  alt={post.title}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
              <div className="aspect-[16/9] w-full px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
                  NightBase Blog
                </p>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-50">{post.title}</p>
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between text-sm font-semibold text-primary">
          <span className="inline-flex items-center gap-2">
            続きを読む
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
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-400">Details</span>
        </div>
      </article>
    </Link>
  );
}
