"use client";

import type { FC } from "react";

interface BlogShareButtonsProps {
  shareUrl: string;
  shareText: string;
  variant?: "header" | "footer";
}

export const BlogShareButtons: FC<BlogShareButtonsProps> = ({ shareUrl, shareText, variant = "header" }) => {
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);

  const wrapperClassName =
    variant === "header"
      ? "flex flex-wrap items-center gap-2 text-[11px]"
      : "flex flex-wrap items-center justify-center gap-3 text-sm";

  const heightClass = variant === "header" ? "h-8 px-3 text-[11px]" : "h-9 px-4 text-sm";

  const handleCopy = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      // eslint-disable-next-line no-alert
      alert("URLをコピーしました");
    } catch (error) {
      console.error("Failed to copy url", error);
    }
  };

  return (
    <div className={wrapperClassName}>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center rounded-full bg-black font-semibold text-white hover:opacity-90 ${heightClass}`}
      >
        Xでポスト
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center rounded-full bg-[#1877F2] font-semibold text-white hover:opacity-90 ${heightClass}`}
      >
        Facebook
      </a>
      <a
        href={`https://line.me/R/msg/text/?${encodedText}%0A${encodedUrl}`}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center rounded-full bg-[#06C755] font-semibold text-white hover:opacity-90 ${heightClass}`}
      >
        LINE
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className={`inline-flex items-center rounded-full border border-slate-300 bg-white font-semibold text-slate-700 hover:border-primary/50 hover:text-primary ${heightClass}`}
      >
        URLをコピー
      </button>
    </div>
  );
};
