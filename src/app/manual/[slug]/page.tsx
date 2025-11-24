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
  params: Promise<{ slug: string }>;
};

function normalizeSlug(value: string) {
  return decodeURIComponent(value).trim();
}

type TocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

function slugifyHeading(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf\u3000\u30fc]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateToc(markdown: string): TocItem[] {
  const lines = markdown.split(/\r?\n/);
  const items: TocItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^###\s+/.test(trimmed)) {
      const text = trimmed.replace(/^###\s+/, "").trim();
      if (!text) continue;
      const normalized = text.replace(/[\s　]+/g, "").toLowerCase();
      if (normalized === "目次" || normalized === "toc") continue;
      items.push({ id: slugifyHeading(text), text, level: 3 });
      continue;
    }
    if (/^##\s+/.test(trimmed)) {
      const text = trimmed.replace(/^##\s+/, "").trim();
      if (!text) continue;
      const normalized = text.replace(/[\s　]+/g, "").toLowerCase();
      if (normalized === "目次" || normalized === "toc") continue;
      items.push({ id: slugifyHeading(text), text, level: 2 });
      continue;
    }
  }

  return items;
}

export async function generateMetadata({ params }: ManualDetailPageParams): Promise<Metadata> {
  const { slug } = await params;
  const targetSlug = normalizeSlug(slug);
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
  const { slug } = await params;
  const targetSlug = normalizeSlug(slug);
  const page = await getManualPageBySlug(targetSlug);

  if (!page) {
    notFound();
  }

  const tocItems = generateToc(page.body_markdown ?? "");

  return (
    <article className="space-y-10">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-[11px] text-primary">
            {page.section}
          </span>
          {page.published_at && (
            <span>{formatDate(page.published_at)}</span>
          )}
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold text-[#0f172a] sm:text-4xl">{page.title}</h1>
          {page.body_markdown ? (
            <p className="text-lg text-neutral-600">
              {page.body_markdown.slice(0, 140)}
              {page.body_markdown.length > 140 ? "…" : ""}
            </p>
          ) : null}
        </div>
      </header>

      <div className="glass-panel space-y-6 p-8 text-base leading-8 text-neutral-700">
        {tocItems.length > 0 && (
          <nav
            aria-label="目次"
            className="overflow-hidden rounded-3xl border border-primary/25 bg-white/95 text-base shadow-md"
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-primary to-primary/80 px-5 py-3 text-sm font-semibold text-white">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-[11px]">
                  目次
                </span>
                <span className="tracking-[0.25em] uppercase">Table of Contents</span>
              </div>
              <span className="text-[12px] opacity-80">Contents</span>
            </div>
            <div className="space-y-1 bg-primary/3 px-5 py-4 text-[15px]">
              {tocItems.map((item, index) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`flex items-start gap-2 rounded-xl px-2 py-1.5 transition hover:bg-primary/8 hover:text-primary ${item.level === 3 ? "ml-4" : ""
                    }`}
                >
                  <span
                    className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 rotate-45 rounded-[2px] bg-primary/70"
                    aria-hidden
                  />
                  <span className="flex-1 leading-snug">
                    <span className="mr-1 inline-block text-[12px] font-semibold text-neutral-500">
                      {index + 1}.
                    </span>
                    {item.text}
                  </span>
                </a>
              ))}
            </div>
          </nav>
        )}
        <div className="prose max-w-none text-neutral-700 prose-headings:text-[#0f172a] prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-[#0f172a] prose-blockquote:border-l-primary/40 prose-blockquote:bg-primary/5 prose-code:rounded prose-code:bg-slate-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-slate-100">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2({ node, children, ...props }) {
                const text = String(children ?? "");
                const id = slugifyHeading(text);
                const baseClass =
                  "mt-12 mb-6 border-l-4 border-primary/80 bg-primary/5 px-5 py-3 text-2xl font-semibold tracking-wide text-[#0f172a]";
                const mergedClass = [baseClass, props.className].filter(Boolean).join(" ");
                return (
                  <h2 id={id} {...props} className={mergedClass}>
                    {children}
                  </h2>
                );
              },
              h3({ node, children, ...props }) {
                const text = String(children ?? "");
                const id = slugifyHeading(text);
                const baseClass =
                  "mt-10 mb-4 border-l-4 border-primary/40 bg-primary/3 px-4 py-2 text-xl font-semibold text-[#0f172a]";
                const mergedClass = [baseClass, props.className].filter(Boolean).join(" ");
                return (
                  <h3 id={id} {...props} className={mergedClass}>
                    {children}
                  </h3>
                );
              },
              img({ node, ...props }) {
                const baseClass =
                  "my-8 w-full max-w-3xl rounded-3xl border border-slate-200/80 bg-white object-cover shadow-md";
                const mergedClass = [baseClass, (props as any).className].filter(Boolean).join(" ");
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img {...props} className={mergedClass} />
                );
              },
              hr(props) {
                const baseClass = "my-10 border-t-2 border-dashed border-slate-200";
                const mergedClass = [baseClass, props.className].filter(Boolean).join(" ");
                return <hr {...props} className={mergedClass} />;
              },
              blockquote({ children, ...props }) {
                const baseClass =
                  "my-8 rounded-2xl border-l-4 border-primary/60 bg-primary/5 px-6 py-4 text-[15px] text-neutral-800";
                const mergedClass = [baseClass, props.className].filter(Boolean).join(" ");
                return (
                  <blockquote {...props} className={mergedClass}>
                    {children}
                  </blockquote>
                );
              },
              ul({ children, ...props }) {
                const baseClass = "my-4 list-disc space-y-1.5 pl-6 marker:text-primary";
                const mergedClass = [baseClass, props.className].filter(Boolean).join(" ");
                return (
                  <ul {...props} className={mergedClass}>
                    {children}
                  </ul>
                );
              },
              ol({ children, ...props }) {
                const baseClass = "my-4 list-decimal space-y-1.5 pl-6 marker:font-semibold marker:text-primary";
                const mergedClass = [baseClass, props.className].filter(Boolean).join(" ");
                return (
                  <ol {...props} className={mergedClass}>
                    {children}
                  </ol>
                );
              },
              table({ children, ...props }) {
                const baseClass = "my-6 w-full border-collapse text-sm";
                const mergedClass = [baseClass, props.className].filter(Boolean).join(" ");
                return (
                  <div className="my-6 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                    <table {...props} className={mergedClass}>
                      {children}
                    </table>
                  </div>
                );
              },
              thead({ children, ...props }) {
                const baseClass = "bg-slate-50";
                const mergedClass = [baseClass, props.className].filter(Boolean).join(" ");
                return (
                  <thead {...props} className={mergedClass}>
                    {children}
                  </thead>
                );
              },
              tbody({ children, ...props }) {
                const baseClass = "divide-y divide-slate-100";
                const mergedClass = [baseClass, props.className].filter(Boolean).join(" ");
                return (
                  <tbody {...props} className={mergedClass}>
                    {children}
                  </tbody>
                );
              },
              tr({ children, ...props }) {
                const baseClass = "hover:bg-slate-50/60";
                const mergedClass = [baseClass, props.className].filter(Boolean).join(" ");
                return (
                  <tr {...props} className={mergedClass}>
                    {children}
                  </tr>
                );
              },
              th({ children, ...props }) {
                const baseClass = "px-4 py-3 text-left text-[13px] font-semibold text-slate-700";
                const mergedClass = [baseClass, props.className].filter(Boolean).join(" ");
                return (
                  <th {...props} className={mergedClass}>
                    {children}
                  </th>
                );
              },
              td({ children, ...props }) {
                const baseClass = "px-4 py-3 align-top text-[13px] text-slate-700";
                const mergedClass = [baseClass, props.className].filter(Boolean).join(" ");
                return (
                  <td {...props} className={mergedClass}>
                    {children}
                  </td>
                );
              },
            }}
          >
            {page.body_markdown ?? "このマニュアルの本文は現在準備中です。"}
          </ReactMarkdown>
        </div>
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
  );
}
