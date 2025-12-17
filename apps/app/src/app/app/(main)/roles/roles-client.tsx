"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Shield, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleSetTab } from "./role-set-tab";
import { RoleFormModal } from "./role-form-modal";

type TabType = "staff" | "cast";

interface Role {
    id: string;
    name: string;
    for_role: "staff" | "cast";
    permissions: Record<string, string>;
    is_system_role?: boolean;
    created_at: string;
}

interface Profile {
    id: string;
    display_name: string;
    real_name: string | null;
    role_id: string | null;
    role: string;
    avatar_url?: string | null;
}

interface RolesPageClientProps {
    roles: Role[];
    profiles: Profile[];
    currentProfileId: string;
    currentRole: string;
    canEdit?: boolean;
}

export function RolesPageClient({ roles, profiles, currentProfileId, currentRole, canEdit = false }: RolesPageClientProps) {
    const [activeTab, setActiveTab] = useState<TabType>("staff");
    const [createModalOpen, setCreateModalOpen] = useState(false);

    // Vercel-style tabs
    const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    useEffect(() => {
        const activeButton = tabsRef.current[activeTab];
        if (activeButton) {
            setIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
            });
        }
    }, [activeTab]);

    const isAdmin = currentRole === "admin";
    const staffRoles = roles.filter(r => r.for_role === "staff");
    const castRoles = roles.filter(r => r.for_role === "cast");
    const adminProfiles = profiles.filter(p => p.role === "admin");
    const staffProfiles = profiles.filter(p => p.role === "staff");
    const castProfiles = profiles.filter(p => p.role === "cast");

    return (
        <div className="space-y-2">
            {/* Create Button */}
            {isAdmin && canEdit && (
                <div className="flex items-center justify-end">
                    <Button
                        size="icon"
                        onClick={() => setCreateModalOpen(true)}
                        className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
            )}

            {/* Vercel-style Tab Navigation */}
            <div className="relative">
                <div className="flex w-full">
                    <button
                        ref={(el) => { tabsRef.current["staff"] = el; }}
                        type="button"
                        onClick={() => setActiveTab("staff")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors relative flex items-center justify-center gap-1.5 ${
                            activeTab === "staff"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        <Shield className="h-4 w-4" />
                        スタッフ
                    </button>
                    <button
                        ref={(el) => { tabsRef.current["cast"] = el; }}
                        type="button"
                        onClick={() => setActiveTab("cast")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors relative flex items-center justify-center gap-1.5 ${
                            activeTab === "cast"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        <Users className="h-4 w-4" />
                        キャスト
                    </button>
                </div>
                <div
                    className="absolute bottom-0 h-0.5 bg-gray-900 dark:bg-white transition-all duration-200"
                    style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Tab Content */}
            {activeTab === "staff" && (
                <RoleSetTab
                    forRole="staff"
                    roles={staffRoles}
                    profiles={staffProfiles}
                    adminProfiles={adminProfiles}
                    currentProfileId={currentProfileId}
                    isAdmin={isAdmin}
                />
            )}

            {activeTab === "cast" && (
                <RoleSetTab
                    forRole="cast"
                    roles={castRoles}
                    profiles={castProfiles}
                    currentProfileId={currentProfileId}
                    isAdmin={isAdmin}
                />
            )}

            {/* Create Modal */}
            <RoleFormModal
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                forRole={activeTab}
            />
        </div>
    );
}
