export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  excerpt?: string | null;
  published_at?: string | null;
}

interface BlogPageProps {
  params: {
    slug: string;
  };
}

async function fetchBlogPost(slug: string): Promise<BlogPost | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!baseUrl || !anonKey) {
    console.warn("Supabase environment variables are not configured.");
    return null;
  }

  const endpoint = new URL("/rest/v1/blog_posts", baseUrl);
  endpoint.searchParams.set("slug", `eq.${slug}`);
  endpoint.searchParams.set("select", "*");

  const response = await fetch(endpoint.toString(), {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Failed to fetch blog post", response.status, response.statusText);
    return null;
  }

  const data = (await response.json()) as BlogPost[];
  return data.length > 0 ? data[0] : null;
}

export default async function BlogPostPage({ params }: BlogPageProps) {
  const post = await fetchBlogPost(params.slug);

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
