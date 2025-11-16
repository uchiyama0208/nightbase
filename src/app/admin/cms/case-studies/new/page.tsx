"use client";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { CaseStudyEditor } from "@/components/admin/cms/CaseStudyEditor";

export default function AdminCaseStudyCreatePage() {
  return (
    <AdminProtected>
      {({ supabase }) => <CaseStudyEditor supabaseClient={supabase} />}
    </AdminProtected>
  );
}
