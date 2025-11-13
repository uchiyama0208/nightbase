import { notFound } from "next/navigation";

import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of locales) {
    const dictionary = await getDictionary(locale);
    dictionary.blog.posts.forEach((post) => {
      params.push({ locale, slug: post.slug });
    });
  }
  return params;
}

export default async function BlogPostPage({
  params
}: {
  params: { locale: string; slug: string };
}) {
  const locale = params.locale as Locale;
  const slug = params.slug;

  if (!locales.includes(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale);
  const post = dictionary.blog.posts.find((item) => item.slug === slug);

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
          <p>
            {locale === "ja"
              ? "近日公開予定のブログコンテンツです。最新情報はニュースレターでお届けします。"
              : "Full article coming soon. Subscribe to stay informed about new releases."}
          </p>
        </div>
      </div>
    </div>
  );
}
