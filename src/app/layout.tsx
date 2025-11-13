import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "Nightbase",
    template: "%s | Nightbase",
  },
  description: "Nightbase は夜でも安心してデータを扱えるモダンなデータプラットフォームです。",
  openGraph: {
    title: "Nightbase",
    description: "Nightbase は夜でも安心してデータを扱えるモダンなデータプラットフォームです。",
    url: "https://nightbase.example.com",
    siteName: "Nightbase",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nightbase",
    description: "Nightbase は夜でも安心してデータを扱えるモダンなデータプラットフォームです。",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className="bg-slate-950">
      <body className="min-h-screen bg-slate-950 font-sans text-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}
