import { siteContent } from "@/content/site";

export default function BlogPage() {
  const { blog } = siteContent;

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
              <a href={`/blog/${post.slug}`} className="text-sm font-semibold text-primary hover:text-primary/80">
                続きを読む
              </a>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
