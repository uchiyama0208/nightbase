export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 60;

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AuroraPage } from "@/components/layouts/AuroraPage";
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
    description: page.body_markdown?.slice(0, 120) ?? "NightBase マニュアル",
  };
}

export default async function ManualDetailPage({ params }: ManualDetailPageParams) {
  const targetSlug = normalizeSlug(params.slug);
  const page = await getManualPageBySlug(targetSlug);

  if (!page) {
    notFound();
  }

  return (
    <AuroraPage variant="violet" containerClassName="max-w-3xl space-y-10">
      <article className="space-y-10">
        <header className="glass-panel space-y-4 p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {page.section}
            </span>
            <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">
              {formatDate(page.published_at ?? page.updated_at ?? page.created_at)}
            </p>
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold text-[#0f172a] sm:text-5xl">{page.title}</h1>
            {page.body_markdown ? (
              <p className="text-lg text-neutral-600">
                {page.body_markdown.slice(0, 140)}
                {page.body_markdown.length > 140 ? "…" : ""}
              </p>
            ) : null}
          </div>
        </header>

        <div className="glass-panel p-8">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            className="prose max-w-none text-neutral-700 prose-headings:text-[#0f172a] prose-a:text-primary hover:prose-a:text-primary/80"
          >
            {page.body_markdown ?? "このマニュアルの本文は現在準備中です。"}
          </ReactMarkdown>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/manual" className="glass-button">
            マニュアル一覧へ戻る
          </Link>
          <Link href="/contact" className="glass-button bg-primary text-white hover:text-white">
            導入について相談する
          </Link>
        </footer>
      </article>
    </AuroraPage>
  );
}
