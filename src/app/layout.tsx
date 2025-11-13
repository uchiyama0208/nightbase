import type { Metadata } from "next";
import "./globals.css";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter"
});

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto"
});

export const metadata: Metadata = {
  title: "NightBase | 夜の接客業のための統合型SaaS",
  description:
    "NightBaseは、キャスト・スタッフ・顧客管理から勤怠・給与・QRオーダーまで一元管理できるナイトワーク業界向けクラウドプラットフォームです。",
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-[#111111] antialiased",
          inter.variable,
          notoSansJp.variable
        )}
      >
        {children}
      </body>
    </html>
  );
}
