import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Suspense } from "react";

import { Toaster } from "@/components/ui/toast";
import { siteContent } from "@/content/site";
import { cn } from "@/lib/utils";
import { SiteShell } from "@/components/SiteShell";
import ConditionalShell from "@/components/ConditionalShell";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

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
      <head>
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-[#111111] antialiased",
        )}
      >
        <Suspense fallback={null}>
          <SiteShell>{children}</SiteShell>
          <Toaster />
        </Suspense>
      </body>
    </html>
  );
}
