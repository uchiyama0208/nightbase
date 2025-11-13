export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  excerpt: string | null;
  published_at: string | null;
}

async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!baseUrl || !anonKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  const response = await fetch(
    `${baseUrl}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(
      slug
    )}&select=*`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      cache: "no-store",
      next: { revalidate: 0 },
    }
  );

  if (!response.ok) {
    return null;
  }

  const posts = (await response.json()) as BlogPost[];

  return posts[0] ?? null;
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post = await getBlogPost(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="container mx-auto max-w-3xl py-10">
      <article className="prose dark:prose-invert">
        <header>
          <h1>{post.title}</h1>
          {post.excerpt ? <p>{post.excerpt}</p> : null}
        </header>
        {post.content ? (
          <section
            dangerouslySetInnerHTML={{
              __html: post.content,
            }}
          />
        ) : null}
      </article>
    </main>
  );
}
