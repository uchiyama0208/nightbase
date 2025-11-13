import { notFound } from "next/navigation";

import { siteContent } from "@/content/site";

export function generateStaticParams() {
  return siteContent.blog.posts.map((post) => ({ slug: post.slug }));
}

export default function BlogPostPage({
  params
}: {
  params: { slug: string };
}) {
  const post = siteContent.blog.posts.find((item) => item.slug === params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="bg-white py-20">
      <div className="container mx-auto max-w-3xl space-y-6">
        <p className="text-xs uppercase tracking-wide text-neutral-400">{post.date}</p>
        <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{post.title}</h1>
        <p className="text-lg text-neutral-600">{post.description}</p>
        <div className="space-y-4 text-sm text-neutral-600">
          <p>近日公開予定のブログコンテンツです。最新情報はニュースレターでお届けします。</p>
        </div>
      </div>
    </div>
  );
}
