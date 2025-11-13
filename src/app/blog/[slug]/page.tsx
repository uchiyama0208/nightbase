export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 60;

import type { Metadata } from "next";

import { createClient } from "@/lib/supabaseClient";
import type { BlogPost } from "@/types/blog";

type BlogPostPageParams = {
  params: { slug: string };
};

async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, slug, title, content, excerpt, cover_image_url, category, published_at, created_at, updated_at, status"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  console.log("DEBUG blog detail slug:", slug);
  console.log("DEBUG blog detail data:", data);
  console.log("DEBUG blog detail error:", error);

  if (error) {
    return null;
  }

  return data ?? null;
}

export async function generateMetadata(
  { params }: BlogPostPageParams
): Promise<Metadata> {
  const targetSlug = decodeURIComponent(params.slug).trim();
  const post = await getBlogPostBySlug(targetSlug);

  if (!post) {
    return {
      title: "記事が見つかりません | NightBaseブログ（デバッグ中）",
      description: "お探しのブログ記事は現在取得できていません。",
    };
  }

  return {
    title: `${post.title} | NightBaseブログ`,
    description: post.excerpt ?? post.content.slice(0, 120),
  };
}

export default async function BlogPostPage({ params }: BlogPostPageParams) {
  const targetSlug = decodeURIComponent(params.slug).trim();
  const post = await getBlogPostBySlug(targetSlug);

  // ★ ここがポイント：notFound() は一旦使わず、デバッグ表示にする
  if (!post) {
    return (
      <main className="container mx-auto max-w-3xl py-10">
        <h1 className="mb-4 text-2xl font-semibold text-red-600">
          デバッグ：記事データが取得できていません
        </h1>
        <pre className="rounded bg-neutral-900 p-4 text-xs text-neutral-100">
          {JSON.stringify(
            {
              paramsSlug: params.slug,
              targetSlug,
              post,
            },
            null,
            2
          )}
        </pre>
        <p className="mt-4 text-sm text-neutral-600">
          Supabase 側のデータや RLS、slug/status が一致していない可能性があります。
        </p>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-3xl py-10">
      <article className="prose dark:prose-invert">
        <header>
          <h1>{post.title}</h1>
          {post.excerpt ? <p>{post.excerpt}</p> : null}
        </header>
        {post.content ? (
          <section className="whitespace-pre-wrap">
            {post.content}
          </section>
        ) : null}
      </article>
    </main>
  );
}
