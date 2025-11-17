"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminCmsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/cms/blog");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)] px-6 text-slate-100">
      <p className="text-sm text-slate-300">CMSの概要ページは廃止されました。ブログ管理へ移動しています…</p>
    </div>
  );
}
