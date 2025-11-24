"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type Role = "cast" | "staff" | "guest";

export function RoleFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentRole = (searchParams.get("role") as Role) || "cast";

    const handleRoleChange = (role: Role) => {
        router.push(`/app/users?role=${role}`);
    };

    const roles: { value: Role; label: string }[] = [
        { value: "cast", label: "キャスト" },
        { value: "staff", label: "スタッフ" },
        { value: "guest", label: "ゲスト" },
    ];

    return (
        <div className="flex gap-2">
            {roles.map((role) => (
                <Button
                    key={role.value}
                    variant={currentRole === role.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleRoleChange(role.value)}
                >
                    {role.label}
                </Button>
            ))}
        </div>
    );
}
