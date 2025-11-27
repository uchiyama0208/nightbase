import type { ReactNode } from "react";

import { AuroraPage } from "@/components/layouts/AuroraPage";
import { ManualSidebar } from "@/components/manual/ManualSidebar";
import { getPublishedManualPages } from "@/lib/manual";

export default async function ManualLayout({ children }: { children: ReactNode }) {
  const pages = await getPublishedManualPages();

  return (
    <AuroraPage variant="violet" containerClassName="max-w-6xl space-y-14">
      <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        <ManualSidebar pages={pages} />
        <div className="space-y-10">{children}</div>
      </div>
    </AuroraPage>
  );
}
