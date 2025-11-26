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
}

export function RolesPageClient({ roles, profiles }: RolesPageClientProps) {
  const [target, setTarget] = useState<RoleTarget>("staff");
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const filteredRoles = roles.filter((role) => {
    const roleTarget: RoleTarget = role.permissions?.target === "cast" ? "cast" : "staff";
    return roleTarget === target;
  });

  return (
    <div className="relative min-h-screen pb-20">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">権限管理</h1>
          <p className="mt-1 text-xs md:text-sm text-gray-500 dark:text-gray-400">
            店舗の役割と権限を設定します。
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between gap-4">
          <div className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
            <button
              type="button"
              onClick={() => setTarget("cast")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                target === "cast"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400"
              )}
            >
              キャスト
            </button>
            <button
              type="button"
              onClick={() => setTarget("staff")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                target === "staff"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400"
              )}
            >
              スタッフ
            </button>
          </div>
          <Button
            size="icon"
            className="h-10 w-10 rounded-full bg-white hover:bg-gray-50 border-2 border-blue-500 text-blue-500"
            onClick={() => triggerRef.current?.click()}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {/* Roles Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRoles.map((role) => (
            <RoleCard key={role.id} role={role} profiles={profiles} />
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
