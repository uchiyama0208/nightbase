import type { Metadata } from "next";
import "./globals.css";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { mainNav } from "@/lib/navigation";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const noto = Noto_Sans_JP({ subsets: ["latin"], variable: "--font-noto-jp" });

export const metadata: Metadata = {
  title: "NightBase | ナイトワークDXのための統合管理SaaS",
  description:
    "NightBaseはバー・ラウンジ・キャバクラ向けに、キャスト・スタッフ・顧客・勤怠・給与・QRオーダーを一元管理するSaaSです。",
  openGraph: {
    title: "NightBase Official",
    description:
      "NightBaseはナイトワーク業界向けの統合クラウド。キャスト管理から給与計算、QRオーダーまでをワンストップで提供。",
    url: "https://nightbase.jp",
    siteName: "NightBase",
    locale: "ja_JP",
    type: "website"
  },
  metadataBase: new URL("https://nightbase.jp")
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${inter.variable} ${noto.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-[#1A1A1A]">
        <Navbar
          items={mainNav}
          ctaHref="/contact"
          ctaLabel="導入相談はこちら"
          localeSwitcher={[
            { label: "JP", href: "/" },
            { label: "EN", href: "/en" }
          ]}
        />
        <main className="pt-24">{children}</main>
        <Footer locale="ja" />
      </body>
    </html>
  );
}
