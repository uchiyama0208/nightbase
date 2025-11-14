"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const adminLinks = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/blog", label: "ブログ管理" },
  { href: "/admin/case-studies", label: "導入事例管理" },
  { href: "/admin/manual", label: "マニュアル管理" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-3">
      {adminLinks.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === item.href
            : pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              isActive
                ? "border-primary bg-primary text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-primary/40 hover:text-primary"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
