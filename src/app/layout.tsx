import type { Metadata } from "next";
import "./globals.css";
import { Inter, Noto_Sans_JP } from "next/font/google";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { siteContent } from "@/content/site";
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
  title: siteContent.metadata.title,
  description: siteContent.metadata.description,
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
        <div className="flex min-h-screen flex-col bg-white">
          <Navbar navigation={siteContent.navigation} />
          <main className="flex-1">{children}</main>
          <Footer footer={siteContent.footer} />
        </div>
      </body>
    </html>
  );
}
