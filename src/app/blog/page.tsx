import { blogPosts } from "@/lib/content";
import Link from "next/link";

export const metadata = {
  title: "ブログ | NightBase",
  description: "ナイトワークDX・経営Tipsのコラムを発信。"
};

export default function BlogPage() {
  return (
    <div className="pb-24">
      <section className="container pt-20">
        <div className="glass-card p-10 text-center">
          <h1 className="section-heading">NightBase Blog</h1>
          <p className="section-subtitle mt-4">
            ナイトワーク業界のDX、キャストマネジメント、顧客体験づくりのヒントを毎月お届けします。
          </p>
        </div>
      </section>
      <section className="container mt-12 grid gap-6 md:grid-cols-3">
        {blogPosts.map((post) => (
          <div key={post.slug} className="glass-card p-6 text-left">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">{post.date}</p>
            <h2 className="mt-3 text-xl font-semibold text-white">{post.title}</h2>
            <p className="mt-3 text-sm text-white/60">{post.excerpt}</p>
            <Link href={`/blog/${post.slug}`} className="mt-4 inline-flex text-sm font-semibold text-accent">
              続きを読む →
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
}
