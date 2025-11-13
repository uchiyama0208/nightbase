import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabaseClient";
import { formatDate } from "@/lib/utils";
import type { BlogPost } from "@/types/blog";

export const revalidate = 60;

async function fetchPostBySlug(slug: string): Promise<BlogPost | null> {
  const decodedSlug = decodeURIComponent(slug);
  const supabase = createClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, slug, title, content, excerpt, cover_image_url, category, published_at, updated_at, status"
    )
    .eq("slug", decodedSlug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("ブログ記事の取得に失敗しました", error);
    return null;
  }

  return data ?? null;
}

type BlogPostPageParams = {
  params: { slug: string };
};

export async function generateMetadata({ params }: BlogPostPageParams): Promise<Metadata> {
  const post = await fetchPostBySlug(params.slug);

  if (!post) {
    return {
      title: "記事が見つかりません | NightBaseブログ",
      description: "お探しのブログ記事は現在公開されていません。",
    };
  }

  return {
    title: `${post.title} | NightBaseブログ`,
    description: post.excerpt ?? post.content.slice(0, 120),
  };
}

export default async function BlogPostPage({ params }: BlogPostPageParams) {
  const post = await fetchPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="bg-white py-24">
      <article className="container mx-auto max-w-3xl space-y-10">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {post.category && (
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {post.category}
              </span>
            )}
            <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">
              {formatDate(post.published_at)}
            </p>
          </div>
          <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{post.title}</h1>
          {post.excerpt && <p className="text-lg text-neutral-600">{post.excerpt}</p>}
        </div>
        <div className="space-y-6 whitespace-pre-wrap text-base leading-8 text-neutral-700">
          {post.content}
        </div>
        <div className="pt-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
          >
            <svg
              aria-hidden
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="m6.5 4.5-3 3 3 3m-3-3h9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            ブログ一覧へ戻る
          </Link>
        </div>
      </article>
    </div>
  );
}
