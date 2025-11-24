import type { Metadata } from "next";
import "./globals.css";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { Suspense } from "react";

import { Toaster } from "@/components/ui/toast";
import { siteContent } from "@/content/site";
import { cn } from "@/lib/utils";
import { SiteShell } from "@/components/SiteShell";
import ConditionalShell from "@/components/ConditionalShell";
import { LineFriendshipChecker } from "@/components/line-friendship-checker";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto",
});

export const metadata: Metadata = {
  title: siteContent.metadata.title,
  icons: {
    icon: "/Nightbase_applogo.png",
  },
};

export default function RootLayout({
  children,
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
        <ConditionalShell>
          <Suspense fallback={null}>
            <LineFriendshipChecker />
          </Suspense>
          {children}
        </ConditionalShell>
        <Toaster />
      </body>
    </html>
  );
}
