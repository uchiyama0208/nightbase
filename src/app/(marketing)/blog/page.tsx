import Link from "next/link";

import { BlogPostList } from "@/components/blog/BlogPostList";
import { AuroraPage } from "@/components/layouts/AuroraPage";
import { siteContent } from "@/content/site";
import { getPublishedBlogPosts } from "@/lib/blog";
import { formatDate } from "@/lib/utils";

export const revalidate = 60;

export default async function BlogPage() {
  const posts = await getPublishedBlogPosts();
  const { title, description } = siteContent.blog;
  const [featuredPost] = posts;
  const featuredPostDate = featuredPost?.published_at ?? featuredPost?.updated_at ?? featuredPost?.created_at ?? null;

  return (
    <AuroraPage variant="violet" containerClassName="space-y-16">
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-8 animate-fade-up">
          <div className="space-y-4">
            <span className="inline-flex items-center rounded-full border border-white/50 bg-white/30 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Blog
            </span>
            <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">{title}</h1>
            <p className="text-lg leading-relaxed text-neutral-600">{description}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-neutral-600">
            <span className="glass-button bg-white/50 text-neutral-600">Apple 風の静かなデザイン</span>
            <span className="glass-button bg-white/50 text-neutral-600">DX / ナイトワークの最新トレンド</span>
            <span className="glass-button bg-white/50 text-neutral-600">プロダクトアップデート</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="glass-button bg-primary text-white hover:text-white">
              NightBaseに相談する
            </Link>
            <Link href="/case-studies" className="glass-button">
              導入事例を読む
            </Link>
          </div>
        </div>
        {featuredPost ? (
          <Link href={`/blog/${featuredPost.slug}`} className="glass-panel hover-lift group block space-y-6 p-8">
            <div className="space-y-4">
              <span className="inline-flex items-center rounded-full border border-secondary/30 bg-secondary/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-secondary">
                最新記事
              </span>
              {featuredPostDate && (
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-400">
                  {formatDate(featuredPostDate)}
                </p>
              )}
              <h2 className="text-2xl font-semibold leading-snug text-[#0f172a] transition group-hover:text-primary">
                {featuredPost.title}
              </h2>
              <p className="text-sm leading-relaxed text-neutral-600">
                {featuredPost.excerpt ?? "NightBase チームの視点で、ナイトワークDXの最新情報をお届けします。"}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
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
          <div className="glass-panel space-y-3 p-8 text-sm text-neutral-500">公開済みの記事が追加されると、ここに最新情報が表示されます。</div>
        )}
      </section>
      <BlogPostList posts={posts} />
    </AuroraPage>
  );
}
