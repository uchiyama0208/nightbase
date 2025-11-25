"use client";

import { usePathname } from "next/navigation";
import { SiteShell } from "@/components/SiteShell";

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const hideShell = pathname.startsWith("/onboarding/") || pathname.startsWith("/invite/") || pathname.startsWith("/auth/");
    return hideShell ? <>{children}</> : <SiteShell>{children}</SiteShell>;
}
