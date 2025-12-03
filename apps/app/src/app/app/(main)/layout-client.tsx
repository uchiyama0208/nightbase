"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { useState } from "react";

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MobileHeader
        onMenuClick={hideSidebar ? () => { } : () => setSidebarOpen(true)}
        profileName={profileName}
        avatarUrl={avatarUrl}
        hasSidebar={!hideSidebar}
      />
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
      <main className={hideSidebar ? "min-h-screen pt-14" : "min-h-screen pt-14 lg:pl-72"}>
        <div className="p-4">
          {children}
        </div>
      </main>
    </div>
  );
}
