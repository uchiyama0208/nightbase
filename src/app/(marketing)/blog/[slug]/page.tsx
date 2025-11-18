export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AuroraPage } from "@/components/layouts/AuroraPage";
import { getPublishedBlogPostBySlug } from "@/lib/blog";
import { formatDate } from "@/lib/utils";

type BlogPostPageParams = {
  params: { slug: string };
};

export async function generateMetadata(
  { params }: BlogPostPageParams
): Promise<Metadata> {
  const normalizedSlug = decodeURIComponent(params.slug ?? "").trim();

  if (!normalizedSlug) {
    return {
      title: "記事が見つかりません | NightBaseブログ",
      description: "お探しのブログ記事は現在公開されていません。",
    };
  }

  const post = await getPublishedBlogPostBySlug(normalizedSlug);

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
  const normalizedSlug = decodeURIComponent(params.slug ?? "").trim();

  if (!normalizedSlug) {
    notFound();
  }

  const post = await getPublishedBlogPostBySlug(normalizedSlug);

  if (!post) {
    notFound();
  }

  const publishedLabel = formatDate(post.published_at ?? post.updated_at ?? post.created_at);

  return (
    <AuroraPage variant="indigo" containerClassName="max-w-4xl space-y-12">
      <article className="space-y-10">
        <header className="space-y-5 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
            {post.category && (
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-[11px] text-primary">
                {post.category}
              </span>
            )}
            <span>{publishedLabel}</span>
          </div>
          <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">{post.title}</h1>
          {post.excerpt && <p className="text-lg text-neutral-600">{post.excerpt}</p>}
        </header>
        <div className="glass-panel space-y-6 p-8 text-base leading-8 text-neutral-700">
          <div className="prose max-w-none whitespace-pre-wrap text-neutral-700 prose-headings:text-[#0f172a]">
            {post.content}
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/blog" className="glass-button">
            ブログ一覧へ戻る
          </Link>
          <Link href="/contact" className="glass-button bg-primary text-white hover:text-white">
            NightBaseに相談する
          </Link>
        </footer>
      </article>
    </AuroraPage>
  );
}
