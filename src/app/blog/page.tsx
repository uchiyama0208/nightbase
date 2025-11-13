import { BlogPostList } from "@/components/blog/BlogPostList";
import { siteContent } from "@/content/site";
import { getPublishedBlogPosts } from "@/lib/blog";

export const revalidate = 60;

export default async function BlogPage() {
  const posts = await getPublishedBlogPosts();
  const { title, description } = siteContent.blog;

  return (
    <div className="bg-white py-24">
      <div className="container space-y-14">
        <header className="mx-auto max-w-3xl space-y-4 text-center">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            Blog
          </span>
          <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{title}</h1>
          <p className="text-lg text-neutral-600">{description}</p>
        </header>
        <BlogPostList posts={posts} />
      </div>
    </div>
  );
}
