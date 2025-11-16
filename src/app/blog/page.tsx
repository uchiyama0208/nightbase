import Link from "next/link";

import { BlogPostList } from "@/components/blog/BlogPostList";
import { siteContent } from "@/content/site";
import { getPublishedBlogPosts } from "@/lib/blog";
import { formatDate } from "@/lib/utils";

export const revalidate = 60;

export default async function BlogPage() {
  const posts = await getPublishedBlogPosts();
  const { title, description } = siteContent.blog;
  const featuredPost = posts[0];

  return (
    <div className="relative overflow-hidden bg-white py-24">
      <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top,_rgba(0,136,255,0.12),_transparent_55%)]" />
      <div className="container space-y-16">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="space-y-3">
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                Blog
              </span>
              <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{title}</h1>
              <p className="text-lg text-neutral-600">{description}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-neutral-500">
              <div className="rounded-full border border-neutral-200 bg-white px-4 py-2">
                Apple 風の静かなデザイン
              </div>
              <div className="rounded-full border border-neutral-200 bg-white px-4 py-2">
                DX / ナイトワークの最新トレンド
              </div>
              <div className="rounded-full border border-neutral-200 bg-white px-4 py-2">
                プロダクトアップデート
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary/90"
              >
                NightBaseに相談する
              </Link>
              <Link
                href="/case-studies"
                className="inline-flex items-center rounded-full border border-primary/30 px-6 py-3 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
              >
                導入事例を読む
              </Link>
            </div>
          </div>
          {featuredPost ? (
            <Link
              href={`/blog/${featuredPost.slug}`}
              className="group block rounded-3xl border border-neutral-100 bg-white/90 p-8 shadow-soft ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="space-y-4">
                <span className="inline-flex items-center rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-secondary">
                  最新記事
                </span>
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-400">
                  {formatDate(featuredPost.published_at)}
                </p>
                <h2 className="text-2xl font-semibold leading-snug text-[#111111] transition group-hover:text-primary">
                  {featuredPost.title}
                </h2>
                <p className="text-sm leading-relaxed text-neutral-600">
                  {featuredPost.excerpt ?? "NightBase チームの視点で、ナイトワークDXの最新情報をお届けします。"}
                </p>
              </div>
              <div className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                続きを読む
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  <path
                    d="M4.5 8h7m0 0-3-3m3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </Link>
          ) : (
            <div className="rounded-3xl border border-dashed border-neutral-200 bg-white/80 p-8 text-sm text-neutral-500">
              公開済みの記事が追加されると、ここに最新情報が表示されます。
            </div>
          )}
        </section>
        <BlogPostList posts={posts} />
      </div>
    </div>
  );
}
