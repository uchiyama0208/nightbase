"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { MobileBottomTabs } from "@/components/mobile-bottom-tabs";
import { CastBottomTabs } from "@/components/cast-bottom-tabs";
import { AIFab } from "@/components/ai-fab";
import { DashboardTabProvider } from "@/contexts/dashboard-tab-context";
import { useState } from "react";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import type { StoreFeatures } from "@/app/app/data-access";

interface AppLayoutClientProps {
  children: React.ReactNode;
  userRole?: string;
  profileName?: string;
  avatarUrl?: string;
  storeName?: string;
  storeFeatures?: StoreFeatures | null;
  hideSidebar?: boolean;
}

export function AppLayoutClient({ children, userRole, profileName, avatarUrl, storeName, storeFeatures, hideSidebar = false }: AppLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // キャストかどうかを判定
  const isCast = userRole === "cast";

  // キャストはサイドバーを非表示
  const shouldHideSidebar = hideSidebar || isCast;

  // Dashboard has its own tab bar built into TabMenuCards
  const isDashboard = pathname === "/app/dashboard";

  return (
    <DashboardTabProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <MobileHeader
          onMenuClick={shouldHideSidebar ? () => { } : () => setSidebarOpen(true)}
          profileName={profileName}
          avatarUrl={avatarUrl}
          hasSidebar={!shouldHideSidebar}
          userRole={userRole}
        />
        {!shouldHideSidebar && (
          <AppSidebar
            userRole={userRole}
            profileName={profileName}
            storeName={storeName}
            storeFeatures={storeFeatures}
            open={sidebarOpen}
            onOpenChange={setSidebarOpen}
          />
        )}
        <main className={shouldHideSidebar ? "min-h-screen pt-12 pb-20" : "min-h-screen pt-12 pb-28 lg:pb-4 lg:pl-72"}>
          <div className="px-4 py-4">
            {children}
          </div>
        </main>

        {/* Cast Bottom Tabs */}
        {isCast && (
          <Suspense fallback={null}>
            <CastBottomTabs />
          </Suspense>
        )}

        {/* Mobile Bottom Tabs - Hidden on Dashboard (has its own integrated tab bar) and for Cast */}
        {!shouldHideSidebar && !isDashboard && (
          <Suspense fallback={null}>
            <MobileBottomTabs />
          </Suspense>
        )}

        {/* AI Assistant FAB - only for admin/staff (not cast) */}
        {(userRole === "admin" || userRole === "staff") && <AIFab />}
      </div>
    </DashboardTabProvider>
  );
}
