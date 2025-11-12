import { blogPostsEn } from "@/lib/content-en";
import Link from "next/link";

export const metadata = {
  title: "Blog | NightBase",
  description: "Insights on nightlife operations and digital transformation."
};

export default function BlogPageEn() {
  return (
    <div className="pb-24">
      <section className="container pt-20">
        <div className="glass-card p-10 text-center">
          <h1 className="section-heading">NightBase Journal</h1>
          <p className="section-subtitle mt-4">
            Strategies and stories from the teams shaping the future of nightlife.
          </p>
        </div>
      </section>
      <section className="container mt-12 grid gap-6 md:grid-cols-3">
        {blogPostsEn.map((post) => (
          <div key={post.slug} className="glass-card p-6 text-left">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">{post.date}</p>
            <h2 className="mt-3 text-xl font-semibold text-white">{post.title}</h2>
            <p className="mt-3 text-sm text-white/60">{post.excerpt}</p>
            <Link href={`/en/blog/${post.slug}`} className="mt-4 inline-flex text-sm font-semibold text-accent">
              Read article →
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
}
