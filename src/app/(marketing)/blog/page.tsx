import Link from "next/link";

import { BlogPostList } from "@/components/blog/BlogPostList";
import { AuroraPage } from "@/components/layouts/AuroraPage";
import { siteContent } from "@/content/site";
import { getPublishedBlogPosts } from "@/lib/blog";

export const revalidate = 60;

export default async function BlogPage() {
  const posts = await getPublishedBlogPosts();
  const { title, description } = siteContent.blog;

  return (
    <AuroraPage variant="violet" containerClassName="space-y-16 px-3 sm:px-4">
      <section className="text-center">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full border border-white/50 bg-white/30 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            Blog
          </span>
          <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">{title}</h1>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-neutral-600">{description}</p>
        </div>
      </section>
      <BlogPostList posts={posts} />
    </AuroraPage>
  );
}
