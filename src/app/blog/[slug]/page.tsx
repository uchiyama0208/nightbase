import { cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabaseClient";
import { formatDate } from "@/lib/utils";
import type { BlogPost } from "@/types/blog";

export const revalidate = 60;

const fetchPostBySlug = cache(async (slug: string): Promise<BlogPost | null> => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, slug, title, content, excerpt, cover_image_url, published_at, created_at, updated_at, status"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("ブログ記事の取得に失敗しました", error);
      throw new Error("ブログ記事の取得に失敗しました");
    }
    return null;
  }

  return data ?? null;
});

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
    return (
      <div className="bg-white py-24">
        <div className="container mx-auto max-w-2xl space-y-6 text-center">
          <span className="inline-flex items-center justify-center rounded-full border border-secondary/40 bg-secondary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
            404
          </span>
          <h1 className="text-3xl font-semibold text-[#111111]">記事が見つかりません</h1>
          <p className="text-neutral-600">
            お探しの記事は非公開になっているか、URLが変更された可能性があります。
          </p>
          <div className="flex justify-center">
            <Link
              href="/blog"
              className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary/90"
            >
              ブログ一覧へ戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white py-24">
      <article className="container mx-auto max-w-3xl space-y-10">
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">
            {formatDate(post.published_at)}
          </p>
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
