export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 60;

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { getManualPageBySlug } from "@/lib/manual";
import { formatDate } from "@/lib/utils";

type ManualDetailPageParams = {
  params: { slug: string };
};

function normalizeSlug(value: string) {
  return decodeURIComponent(value).trim();
}

export async function generateMetadata({ params }: ManualDetailPageParams): Promise<Metadata> {
  const targetSlug = normalizeSlug(params.slug);
  const page = await getManualPageBySlug(targetSlug);

  if (!page) {
    return {
      title: "マニュアルが見つかりません | NightBase マニュアル",
      description: "お探しのマニュアルは現在公開されていません。",
    };
  }

  return {
    title: `${page.title} | NightBase マニュアル`,
    description: page.summary ?? page.body_markdown.slice(0, 120),
  };
}

export default async function ManualDetailPage({ params }: ManualDetailPageParams) {
  const targetSlug = normalizeSlug(params.slug);
  const page = await getManualPageBySlug(targetSlug);

  if (!page) {
    notFound();
  }

  return (
    <div className="bg-white py-24">
      <article className="container mx-auto max-w-3xl space-y-10 px-4 sm:px-6 lg:px-8">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {page.category}
            </span>
            <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">
              {formatDate(page.published_at ?? page.updated_at ?? page.created_at)}
            </p>
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold text-[#111111] sm:text-5xl">{page.title}</h1>
            {page.summary ? <p className="text-lg text-neutral-600">{page.summary}</p> : null}
          </div>
        </header>

        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          className="prose max-w-none text-neutral-700 prose-headings:text-[#111111] prose-a:text-primary hover:prose-a:text-primary/80"
        >
          {page.body_markdown}
        </ReactMarkdown>

        <footer className="pt-8">
          <Link
            href="/manual"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
          >
            <svg
              aria-hidden
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="m6.5 4.5-3 3 3 3m-3-3h9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            マニュアル一覧へ戻る
          </Link>
        </footer>
      </article>
    </div>
  );
}
