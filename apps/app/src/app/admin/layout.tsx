"use client";

import type { ReactNode } from "react";
import { AdminProtected } from "@/components/admin/AdminProtected";
import { AdminSidebar } from "./components/admin-sidebar";
import { AdminHeader } from "./components/admin-header";
import { useState } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <AdminProtected>
            {({ userEmail }) => (
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                    <AdminHeader
                        onMenuClick={() => setSidebarOpen(true)}
                        userEmail={userEmail}
                    />
                    <AdminSidebar
                        open={sidebarOpen}
                        onOpenChange={setSidebarOpen}
                    />
                    <main className="min-h-screen pt-12 pb-4 lg:pl-72">
                        <div className="px-4 py-4">
                            {children}
                        </div>
                    </main>
                </div>
            )}
        </AdminProtected>
    );
}
