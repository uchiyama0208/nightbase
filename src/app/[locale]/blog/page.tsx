import { notFound } from "next/navigation";

import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export default async function BlogPage({
  params
}: {
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  if (!locales.includes(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale);
  const blog = dictionary.blog;

  return (
    <div className="bg-white py-20">
      <div className="container space-y-12">
        <header className="mx-auto max-w-3xl space-y-4 text-center">
          <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{blog.title}</h1>
          <p className="text-lg text-neutral-600">{blog.description}</p>
        </header>
        <div className="grid gap-8 md:grid-cols-2">
          {blog.posts.map((post) => (
            <article key={post.slug} className="glass-panel space-y-4 p-8">
              <p className="text-xs uppercase tracking-wide text-neutral-400">{post.date}</p>
              <h2 className="text-2xl font-semibold text-[#111111]">{post.title}</h2>
              <p className="text-sm text-neutral-500">{post.description}</p>
              <a
                href={`/${locale}/blog/${post.slug}`}
                className="text-sm font-semibold text-primary hover:text-primary/80"
              >
                {locale === "ja" ? "続きを読む" : "Read more"}
              </a>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
