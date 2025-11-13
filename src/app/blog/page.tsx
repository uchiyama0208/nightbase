import { cache } from "react";

import { BlogPostList } from "@/components/blog/BlogPostList";
import { siteContent } from "@/content/site";
import { createClient } from "@/lib/supabaseClient";
import type { BlogPost } from "@/types/blog";

export const revalidate = 60;

const fetchPublishedPosts = cache(async (): Promise<BlogPost[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, slug, title, content, excerpt, cover_image_url, published_at, created_at, updated_at, status"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("ブログ記事の取得に失敗しました", error);
    return [];
  }

  return data ?? [];
});

export default async function BlogPage() {
  const posts = await fetchPublishedPosts();
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
