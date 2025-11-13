import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublishedBlogPostBySlug, getPublishedBlogPosts } from "@/lib/blog";
import { formatDate } from "@/lib/utils";

export const revalidate = 60;
export const dynamic = "force-dynamic";
export const dynamicParams = true;

type BlogPostPageParams = {
  params: { slug: string };
};

export async function generateMetadata({ params }: BlogPostPageParams): Promise<Metadata> {
  try {
    const targetSlug = decodeURIComponent(params.slug).trim();

    let post = await getPublishedBlogPostBySlug(targetSlug);

    if (!post) {
      const fallbackPosts = await getPublishedBlogPosts();
      post = fallbackPosts.find((item) => item.slug === targetSlug) ?? null;
    }

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
  } catch (error) {
    console.error("ブログ記事のメタデータ生成に失敗しました", error);
    return {
      title: "記事が見つかりません | NightBaseブログ",
      description: "お探しのブログ記事は現在公開されていません。",
    };
  }
}

export default async function BlogPostPage({ params }: BlogPostPageParams) {
  try {
    const targetSlug = decodeURIComponent(params.slug).trim();

    let post = await getPublishedBlogPostBySlug(targetSlug);

    if (!post) {
      const fallbackPosts = await getPublishedBlogPosts();
      post = fallbackPosts.find((item) => item.slug === targetSlug) ?? null;
    }

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
  } catch (error) {
    console.error("ブログ記事ページの描画に失敗しました", error);
    notFound();
  }
}

// `dynamicParams` + `force-dynamic` ensure newly published posts are routable
// without requiring a full rebuild. Static params generation is intentionally
// omitted so that Supabase remains the single source of truth for available
// slugs at runtime.

