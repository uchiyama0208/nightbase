"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VercelTabs } from "@/components/ui/vercel-tabs";
import { RoleSetTab } from "./role-set-tab";
import { RoleFormModal } from "./role-form-modal";
import type { StoreFeatures } from "@/app/app/data-access";

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
    storeFeatures?: StoreFeatures | null;
}

export function RolesPageClient({ roles, profiles, currentProfileId, currentRole, canEdit = false, storeFeatures }: RolesPageClientProps) {
    const [activeTab, setActiveTab] = useState<TabType>("staff");
    const [createModalOpen, setCreateModalOpen] = useState(false);

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

            {/* Tab Navigation */}
            <VercelTabs
                tabs={[
                    { key: "staff", label: "スタッフ" },
                    { key: "cast", label: "キャスト" }
                ]}
                value={activeTab}
                onChange={(val) => setActiveTab(val as TabType)}
                className="mb-4"
            />

            {/* Tab Content */}
            {activeTab === "staff" && (
                <RoleSetTab
                    forRole="staff"
                    roles={staffRoles}
                    profiles={staffProfiles}
                    adminProfiles={adminProfiles}
                    currentProfileId={currentProfileId}
                    isAdmin={isAdmin}
                    storeFeatures={storeFeatures}
                />
            )}

            {activeTab === "cast" && (
                <RoleSetTab
                    forRole="cast"
                    roles={castRoles}
                    profiles={castProfiles}
                    currentProfileId={currentProfileId}
                    isAdmin={isAdmin}
                    storeFeatures={storeFeatures}
                />
            )}

            {/* Create Modal */}
            <RoleFormModal
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                forRole={activeTab}
                storeFeatures={storeFeatures}
            />
        </div>
    );
}
