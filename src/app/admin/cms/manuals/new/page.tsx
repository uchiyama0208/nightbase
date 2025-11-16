"use client";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { ManualEditor } from "@/components/admin/cms/ManualEditor";

export default function AdminManualCreatePage() {
  return (
    <AdminProtected>
      {() => <ManualEditor />}
    </AdminProtected>
  );
}
