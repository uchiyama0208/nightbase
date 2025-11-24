"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { siteContent } from "@/content/site";

interface SiteShellProps {
  children: ReactNode;
}

export function SiteShell({ children }: SiteShellProps) {
  const pathname = usePathname();

  const isAdminRoute = pathname?.startsWith("/admin");
  const isAppRoute = pathname?.startsWith("/app");
  const isTabletRoute = pathname?.startsWith("/tablet");

  if (isAdminRoute || isAppRoute || isTabletRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#111111]">
      <Navbar navigation={siteContent.navigation} />
      <main className="flex-1">{children}</main>
      <Footer footer={siteContent.footer} />
    </div>
  );
}
