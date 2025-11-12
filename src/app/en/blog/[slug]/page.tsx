import { notFound } from "next/navigation";
import { blogPosts } from "@/lib/content";

interface BlogPostPageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export const dynamicParams = false;

export default function BlogPostPageEn({ params }: BlogPostPageProps) {
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
            {post.excerpt} We continue to interview operators and analyze data to surface new playbooks for the nightlife industry.
          </p>
        </div>
      </section>
    </div>
  );
}
