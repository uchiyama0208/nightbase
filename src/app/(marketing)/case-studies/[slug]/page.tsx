export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import type { Metadata } from "next";

import { AuroraPage } from "@/components/layouts/AuroraPage";
import { SidebarCtaCard } from "@/components/SidebarCtaCard";
import { BlogShareButtons } from "@/components/blog/BlogShareButtons";
import { formatCaseStudyIndustry, getPublishedCaseStudies, getPublishedCaseStudyBySlug } from "@/lib/caseStudies";
import { formatDate } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

type CaseStudyDetailPageParams = {
  params: Promise<{ slug: string }>;
};

function parseMultiline(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export async function generateMetadata({ params }: CaseStudyDetailPageParams): Promise<Metadata> {
  const { slug } = await params;
  const targetSlug = decodeURIComponent(slug).trim();
  const caseStudy = await getPublishedCaseStudyBySlug(targetSlug);

  if (!caseStudy) {
    return {
      title: "導入事例が見つかりません | NightBase",
      description: "お探しの導入事例は現在公開されていません。",
    };
  }

  const fallback = formatCaseStudyIndustry(caseStudy.industry);
  const descriptionPreview = caseStudy.summary?.split(/\r?\n/)[0];
  const descriptionText =
    descriptionPreview?.slice(0, 120) ||
    caseStudy.results?.slice(0, 120) ||
    (fallback ? `${fallback} の導入事例` : "NightBase 導入事例");

  return {
    title: `${caseStudy.title} | NightBase導入事例`,
    description: descriptionText,
  };
}

export default async function CaseStudyDetailPage({ params }: CaseStudyDetailPageParams) {
  const { slug } = await params;
  const targetSlug = decodeURIComponent(slug).trim();
  const caseStudy = await getPublishedCaseStudyBySlug(targetSlug);

  if (!caseStudy) {
    return (
      <AuroraPage variant="teal" containerClassName="max-w-5xl space-y-16">
        <header className="glass-panel space-y-5 p-10 text-center">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-[#0f172a] sm:text-4xl">
              導入事例が見つかりません
            </h1>
            <p className="text-sm text-neutral-600">
              お探しの導入事例は現在公開されていないか、URL が変更されている可能性があります。
            </p>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link href="/case-studies" className="glass-button">
              導入事例一覧に戻る
            </Link>
            <Link href="/contact" className="glass-button bg-primary text-white hover:text-white">
              NightBase に相談する
            </Link>
          </div>
        </header>
      </AuroraPage>
    );
  }

  const tags = Array.isArray(caseStudy.tags) ? caseStudy.tags : [];
  const industryTag = tags.find((tag) => formatCaseStudyIndustry(tag) !== tag) ?? null;
  const industryLabel = industryTag ? formatCaseStudyIndustry(industryTag) : null;
  const publishedLabel = caseStudy.published_at ? formatDate(caseStudy.published_at) : null;
  const coverImageUrl = caseStudy.cover_image_url ?? "";

  const tocItems = generateToc(caseStudy.body ?? "");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const shareUrl = `${siteUrl}/case-studies/${caseStudy.slug}`;

  const allStudies = await getPublishedCaseStudies();
  const relatedStudies = allStudies
    .filter((s) => s.id !== caseStudy.id)
    .filter((s) => {
      if (!tags.length) return false;
      const otherTags = s.tags ?? [];
      return otherTags.some((tag) => tags.includes(tag));
    })
    .slice(0, 3);

  const latestStudies = allStudies
    .filter((s) => s.id !== caseStudy.id)
    .slice(0, 3);

  return (
    <AuroraPage variant="teal" containerClassName="max-w-6xl space-y-16 px-3 pb-20 sm:px-4 md:pb-0">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2.3fr)_minmax(260px,1fr)]">
        <article className="space-y-10">
          {/* パンくず + SNS共有 */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-500">
            <nav className="flex flex-wrap items-center gap-1">
              <Link href="/" className="inline-flex items-center gap-1 hover:text-primary">
                <span aria-hidden>🏠</span>
                <span className="font-semibold">HOME</span>
              </Link>
              <span aria-hidden className="px-1">
                &gt;
              </span>
              <Link href="/case-studies" className="hover:text-primary">
                導入事例
              </Link>
              {industryLabel && (
                <>
                  <span aria-hidden className="px-1">
                    &gt;
                  </span>
                  <span className="text-neutral-600">{industryLabel}</span>
                </>
              )}
            </nav>

            <BlogShareButtons shareUrl={shareUrl} shareText={caseStudy.title} variant="header" />
          </div>

          <header className="space-y-5 text-center lg:text-left">
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400 lg:justify-start">
              {industryLabel && (
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-[11px] text-primary">
                  {industryLabel}
                </span>
              )}
              {publishedLabel && <span>{publishedLabel}</span>}
            </div>
            <h1 className="text-3xl font-semibold text-[#0f172a] sm:text-4xl">{caseStudy.title}</h1>
            {caseStudy.summary && <p className="text-lg text-neutral-600">{caseStudy.summary}</p>}
          </header>

          {coverImageUrl ? (
            <div className="overflow-hidden rounded-3xl border border-neutral-200/70 bg-neutral-950/80 shadow-lg">
              <div className="aspect-[16/9] w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImageUrl}
                  alt={caseStudy.title}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-lg">
              <div className="aspect-[16/9] w-full px-8 py-7">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
                  NightBase Case Study
                </p>
                <p className="mt-3 line-clamp-2 text-lg font-semibold text-white">{caseStudy.title}</p>
              </div>
            </div>
          )}

          <div className="glass-panel space-y-6 p-8 text-base leading-8 text-neutral-700">
            {tocItems.length > 0 && (
              <nav
                aria-label="記事の目次"
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
                {caseStudy.body ?? "この導入事例の本文は現在準備中です。"}
              </ReactMarkdown>
            </div>
          </div>

          {/* NightBase 開始CTA */}
          <section className="mt-4 space-y-3 rounded-3xl bg-gradient-to-r from-primary via-primary to-primary/80 px-6 py-5 text-center text-white shadow-lg">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-white/80">Start NightBase</p>
            <p className="text-lg font-semibold">ナイトワーク向けDXを、NightBaseで今日からはじめませんか？</p>
            <p className="text-xs text-white/80">
              店舗の規模や課題に合わせて、最適な導入プランをご提案します。
            </p>
            <div className="pt-2">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2 text-sm font-semibold text-primary shadow hover:bg-slate-50"
              >
                NightBaseの導入について相談する
              </Link>
            </div>
          </section>

          {/* 記事共有エリア（本文下） */}
          <section className="mt-8 space-y-4 text-center">
            <p className="text-xs font-semibold tracking-[0.3em] text-neutral-500">＼ この導入事例をシェアする ／</p>
            <BlogShareButtons shareUrl={shareUrl} shareText={caseStudy.title} variant="footer" />
          </section>

          {/* タグ表示 */}
          {tags.length > 0 && (
            <section className="mt-6 space-y-2 text-sm">
              <p className="text-xs font-semibold text-neutral-500">タグ</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-neutral-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* 関連導入事例（サムネ付き） */}
          {relatedStudies.length > 0 && (
            <section className="mt-10 space-y-4">
              <h2 className="text-base font-semibold text-[#0f172a]">この導入事例も読まれています</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {relatedStudies.map((related) => (
                  <Link
                    key={related.id}
                    href={`/case-studies/${related.slug}`}
                    className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40"
                  >
                    <div className="overflow-hidden bg-slate-100">
                      <div className="aspect-[16/9] w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={related.cover_image_url ?? coverImageUrl ?? ""}
                          alt={related.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      </div>
                    </div>
                    <div className="space-y-1 px-4 py-3 text-sm">
                      <p className="line-clamp-2 font-semibold text-[#0f172a] group-hover:text-primary">
                        {related.title}
                      </p>
                      {related.published_at && (
                        <p className="text-xs text-neutral-500">{formatDate(related.published_at)}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <footer className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <Link href="/case-studies" className="glass-button">
              導入事例一覧に戻る
            </Link>
          </footer>
        </article>
        <div className="hidden space-y-6 lg:sticky lg:top-24 lg:bottom-24 lg:block">
          {latestStudies.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[#0f172a]">最新の導入事例</h2>
              <div className="space-y-3">
                {latestStudies.map((latest) => (
                  <Link
                    key={latest.id}
                    href={`/case-studies/${latest.slug}`}
                    className="group flex gap-3 rounded-2xl bg-white/70 p-2 text-xs shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:bg-white hover:ring-primary/40"
                  >
                    <div className="flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      <div className="aspect-[4/3] w-24">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={latest.cover_image_url ?? coverImageUrl ?? ""}
                          alt={latest.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
                      <p className="line-clamp-2 font-semibold text-[#0f172a] group-hover:text-primary">
                        {latest.title}
                      </p>
                      {latest.published_at && (
                        <p className="text-[11px] text-neutral-500">{formatDate(latest.published_at)}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <SidebarCtaCard context="case-study" />
        </div>
      </div>

      {/* モバイル用 固定ボトムCTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(15,23,42,0.08)] md:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex flex-col text-[11px] text-neutral-600">
            <span className="font-semibold text-neutral-800">NightBaseの導入相談</span>
            <span>同じような成果を目指す導入イメージをご提案します。</span>
          </div>
          <Link
            href="/contact"
            className="inline-flex flex-shrink-0 items-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            利用を相談する
          </Link>
        </div>
      </div>
    </AuroraPage>
  );
}
