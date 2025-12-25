import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Suspense } from "react";

import { Toaster } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

export const viewport: Viewport = {
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "NightBase App",
  description: "NightBase App",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NightBase App",
  },
  formatDetection: {
    telephone: false,
  },
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
        suppressHydrationWarning
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased",
        )}
      >
        <ThemeProvider initialTheme="light">
          <Suspense fallback={null}>
            {children}
            <Toaster />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
