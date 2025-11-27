"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { RoleFormDialog } from "./role-form-dialog";
import { RoleCard } from "./role-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type RoleTarget = "staff" | "cast";

interface Role {
  id: string;
  name: string;
  permissions: any;
  is_system_role?: boolean;
  created_at: string;
}

interface Profile {
  id: string;
  display_name: string;
  real_name: string | null;
  role_id: string | null;
}

interface RolesPageClientProps {
  roles: Role[];
  profiles: Profile[];
  currentProfileId: string;
}

export function RolesPageClient({ roles, profiles, currentProfileId }: RolesPageClientProps) {
  const [target, setTarget] = useState<RoleTarget>("staff");
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const filteredRoles = roles.filter((role) => {
    const roleTarget: RoleTarget = role.permissions?.target === "cast" ? "cast" : "staff";
    return roleTarget === target;
  });

  const roleIndex = target === "cast" ? 0 : 1;

  return (
    <div className="relative min-h-screen pb-20">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">権限</h1>
          <p className="mt-2 text-sm text-muted-foreground dark:text-gray-400">
            店舗の役割と権限を設定します。
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative inline-flex h-10 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
            <div
              className="absolute h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-transform duration-300 ease-in-out"
              style={{
                width: "80px",
                left: "4px",
                transform: `translateX(calc(${roleIndex} * (80px + 0px)))`
              }}
            />
            <button
              type="button"
              onClick={() => setTarget("cast")}
              className={cn(
                "relative z-10 w-20 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200",
                target === "cast"
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              キャスト
            </button>
            <button
              type="button"
              onClick={() => setTarget("staff")}
              className={cn(
                "relative z-10 w-20 flex items-center justify-center h-8 rounded-full text-sm font-medium transition-colors duration-200",
                target === "staff"
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              スタッフ
            </button>
          </div>
          <Button
            size="icon"
            className="h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md transition-all hover:scale-105 active:scale-95"
            onClick={() => triggerRef.current?.click()}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {/* Roles Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRoles.map((role) => (
            <RoleCard key={role.id} role={role} profiles={profiles} currentProfileId={currentProfileId} />
          ))}
        </div>
      </div>

      {/* Hidden Dialog Trigger */}
      <RoleFormDialog
        target={target}
        trigger={<button ref={triggerRef} className="hidden" />}
      />
    </div>
  );
}
