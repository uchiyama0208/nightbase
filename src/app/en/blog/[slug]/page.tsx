import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogPostsEn } from "@/lib/content-en";
import type { BlogPost } from "@/lib/content";

interface BlogPostPageProps {
  params: { slug: BlogPost["slug"] };
}

export function generateStaticParams() {
  return blogPostsEn.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: BlogPostPageProps): Metadata {
  const post = blogPostsEn.find((item) => item.slug === params.slug);

  if (!post) {
    return {
      title: "NightBase Journal",
      description: "Insights on nightlife operations and digital transformation."
    };
  }

  return {
    title: `${post.title} | NightBase`,
    description: post.excerpt,
    openGraph: {
      title: `${post.title} | NightBase`,
      description: post.excerpt
    }
  };
}

export const dynamicParams = false;

export default function BlogPostPageEn({ params }: BlogPostPageProps) {
  const post = blogPostsEn.find((item) => item.slug === params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="pb-24">
      <section className="container pt-20">
        <div className="glass-card p-10">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Blog</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">{post.title}</h1>
          <p className="mt-2 text-sm text-slate-500">{post.date}</p>
          <p className="mt-6 text-sm text-slate-600 leading-relaxed">
            {post.excerpt} We continue to interview operators and analyze data to surface new playbooks for the nightlife industry.
          </p>
        </div>
      </section>
    </div>
  );
}
