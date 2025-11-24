"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { usePathname, useSelectedLayoutSegments } from "next/navigation";
import { CircleUser, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { adminNavigationSections } from "@/components/admin/AdminNav";
import { cn } from "@/lib/utils";

type AdminHeaderProps = {
  userEmail: string | null;
  supabaseClient: any;
  onRefreshAuth: () => Promise<void>;
};

function resolveSection(segments: string[]): { title: string; subtitle: string } {
  if (segments.length === 0) {
    return { title: "ダッシュボード", subtitle: "NightBase Admin" };
  }

  const joined = segments.join("/");

  if (joined.startsWith("cms/blog")) {
    return { title: "ブログ", subtitle: "CMS" };
  }

  if (joined.startsWith("cms/case-studies")) {
    return { title: "導入事例", subtitle: "CMS" };
  }

  if (joined.startsWith("cms/manuals")) {
    return { title: "マニュアル", subtitle: "CMS" };
  }

  if (joined.startsWith("cms")) {
    return { title: "CMS", subtitle: "コンテンツ管理" };
  }

  if (joined.startsWith("settings")) {
    return { title: "設定", subtitle: "システム" };
  }

  if (joined.startsWith("users")) {
    return { title: "ユーザー管理", subtitle: "システム" };
  }

  if (joined.startsWith("analytics")) {
    return { title: "分析", subtitle: "レポート" };
  }

  return { title: "管理画面", subtitle: "NightBase" };
}

export function AdminHeader({ userEmail, supabaseClient, onRefreshAuth }: AdminHeaderProps) {
  const pathname = usePathname();
  const segments = useSelectedLayoutSegments();
  const [, startTransition] = useTransition();

  const section = useMemo(() => resolveSection(segments), [segments]);

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full flex-none items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="border-slate-300 bg-white text-slate-700 lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-white p-0 text-slate-900">
            <SheetHeader className="px-6 pt-6">
              <SheetTitle className="text-slate-900">NightBase Admin</SheetTitle>
            </SheetHeader>
            <nav className="space-y-8 px-6 pb-10">
              {adminNavigationSections.map((section) => (
                <div key={section.title} className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    {section.title}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium",
                          pathname?.startsWith(item.href)
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <div className="hidden flex-col lg:flex">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{section.subtitle}</span>
          <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden flex-col items-end text-xs leading-tight text-slate-500 sm:flex">
          <span className="font-semibold text-slate-900">{userEmail ?? "Admin"}</span>
          <span className="text-slate-400">NightBase Team</span>
        </div>
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          aria-label="アカウント設定"
        >
          <Link href="/admin/settings">
            <CircleUser className="h-6 w-6" />
          </Link>
        </Button>
        <Button asChild type="button" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
          <Link href="/">ホームページに戻る</Link>
        </Button>
      </div>
    </header>
  );
}
