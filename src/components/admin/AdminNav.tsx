"use client";

import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  NotebookPen,
  Settings,
  Users
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type AdminNavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

type AdminNavSection = {
  title: string;
  items: AdminNavItem[];
};

export const adminNavigationSections: AdminNavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "ダッシュボード", icon: LayoutDashboard }
    ]
  },
  {
    title: "CMS",
    items: [
      { href: "/admin/cms/blog", label: "ブログ", icon: FileText },
      { href: "/admin/cms/case-studies", label: "導入事例", icon: ClipboardCheck },
      { href: "/admin/cms/manuals", label: "マニュアル", icon: NotebookPen }
    ]
  },
  {
    title: "System",
    items: [
      { href: "/admin/analytics", label: "分析", icon: BarChart3 },
      { href: "/admin/settings", label: "設定", icon: Settings },
      { href: "/admin/users", label: "ユーザー管理", icon: Users }
    ]
  }
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-none border-r border-slate-200 bg-white pt-6 text-slate-700 lg:flex">
      <ScrollArea className="w-full px-6">
        <div className="space-y-8 pb-12">
          {adminNavigationSections.map((section) => (
            <div key={section.title} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                {section.title}
              </p>
              <nav className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname?.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                        isActive
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
          <div className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
            <h3 className="text-sm font-semibold text-slate-800">サポート</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              運用に関するお問い合わせは support@nightbase.jp までご連絡ください。
            </p>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
