import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogPosts } from "@/lib/content";
import type { BlogPost } from "@/lib/content";

interface BlogPostPageProps {
  params: { slug: BlogPost["slug"] };
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: BlogPostPageProps): Metadata {
  const post = blogPosts.find((item) => item.slug === params.slug);

  if (!post) {
    return {
      title: "NightBaseブログ",
      description: "ナイトワークDXに関する最新情報をお届けします。"
    };
  }

  return {
    title: `${post.title} | NightBaseブログ`,
    description: post.excerpt,
    openGraph: {
      title: `${post.title} | NightBase`,
      description: post.excerpt
    }
  };
}

export const dynamicParams = false;

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = blogPosts.find((item) => item.slug === params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="pb-24">
      <section className="container pt-20">
        <div className="glass-card p-10">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Blog</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">{post.title}</h1>
          <p className="mt-2 text-sm text-white/60">{post.date}</p>
          <p className="mt-6 text-sm text-white/70 leading-relaxed">
            {post.excerpt} NightBaseチームは、現場インタビューとデータ分析を通じて、業界の未来像をアップデートし続けています。
          </p>
        </div>
      </section>
    </div>
  );
}
