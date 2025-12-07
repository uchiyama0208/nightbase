"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { MobileBottomTabs } from "@/components/mobile-bottom-tabs";
import { AIFab } from "@/components/ai-fab";
import { DashboardTabProvider } from "@/contexts/dashboard-tab-context";
import { useState } from "react";
import { Suspense } from "react";
import { usePathname } from "next/navigation";

interface StoreFeatures {
  show_dashboard: boolean;
  show_attendance: boolean;
  show_timecard: boolean;
  show_users: boolean;
  show_roles: boolean;
}

interface AppLayoutClientProps {
  children: React.ReactNode;
  userRole?: string;
  profileName?: string;
  avatarUrl?: string;
  storeName?: string;
  storeFeatures?: StoreFeatures;
  hideSidebar?: boolean;
}

export function AppLayoutClient({ children, userRole, profileName, avatarUrl, storeName, storeFeatures, hideSidebar = false }: AppLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Dashboard has its own tab bar built into TabMenuCards
  const isDashboard = pathname === "/app/dashboard";

  return (
    <DashboardTabProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Suspense fallback={<div className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-12" />}>
          <MobileHeader
            onMenuClick={hideSidebar ? () => { } : () => setSidebarOpen(true)}
            profileName={profileName}
            avatarUrl={avatarUrl}
            hasSidebar={!hideSidebar}
          />
        </Suspense>
        {!hideSidebar && (
          <AppSidebar
            userRole={userRole}
            profileName={profileName}
            storeName={storeName}
            storeFeatures={storeFeatures}
            open={sidebarOpen}
            onOpenChange={setSidebarOpen}
          />
        )}
        <main className={hideSidebar ? "min-h-screen pt-12 pb-28 lg:pb-4" : "min-h-screen pt-12 pb-28 lg:pb-4 lg:pl-72"}>
          <div className="px-4 py-4">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Tabs - Hidden on Dashboard (has its own integrated tab bar) */}
        {!hideSidebar && !isDashboard && (
          <Suspense fallback={null}>
            <MobileBottomTabs />
          </Suspense>
        )}

        {/* AI Assistant FAB - only for admin/staff */}
        {(userRole === "admin" || userRole === "staff") && <AIFab />}
      </div>
    </DashboardTabProvider>
  );
}
