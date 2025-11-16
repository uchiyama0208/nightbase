"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { usePathname, useSelectedLayoutSegments } from "next/navigation";
import { CircleUser, LogOut, Menu } from "lucide-react";

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
    <header className="sticky top-0 z-40 flex h-20 w-full flex-none items-center justify-between border-b border-white/10 bg-slate-950/80 px-6 backdrop-blur">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-slate-900 text-slate-100 lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-slate-950/95 p-0 text-slate-100">
            <SheetHeader className="px-6 pt-6">
              <SheetTitle>NightBase Admin</SheetTitle>
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
                            ? "bg-primary/20 text-white"
                            : "text-slate-400 hover:bg-slate-900/80 hover:text-slate-100"
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
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2 text-slate-100">
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-[0.3em] text-white">
              NB
            </span>
            <span className="text-sm font-semibold tracking-[0.2em] text-slate-300">Admin</span>
          </Link>
          <span className="hidden h-8 w-px bg-white/10 lg:block" aria-hidden />
          <div className="hidden flex-col lg:flex">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">{section.subtitle}</span>
            <h2 className="text-xl font-semibold text-slate-50">{section.title}</h2>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden flex-col items-end text-xs leading-tight text-slate-400 sm:flex">
          <span className="font-semibold text-slate-200">{userEmail ?? "Admin"}</span>
          <span className="text-slate-500">NightBase Team</span>
        </div>
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full bg-slate-900/80 text-slate-100 hover:bg-slate-800"
          aria-label="アカウント設定"
        >
          <Link href="/admin/settings">
            <CircleUser className="h-6 w-6" />
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-white/20 text-slate-100"
          onClick={() =>
            startTransition(async () => {
              await supabaseClient.auth.signOut();
              await onRefreshAuth();
            })
          }
        >
          <LogOut className="mr-2 h-4 w-4" /> ログアウト
        </Button>
      </div>
    </header>
  );
}
