import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";

import { Toaster } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Nightbase - 夜のお店の経営を支援",
  description: "Nightbaseは夜のお店の経営を効率化するSaaSプラットフォームです",
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
