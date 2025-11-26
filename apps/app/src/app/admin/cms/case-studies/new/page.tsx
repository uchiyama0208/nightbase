"use client";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { BlogEditor } from "@/components/admin/cms/BlogEditor";

export default function AdminCaseStudyCreatePage() {
  return (
    <AdminProtected>
      {({ supabase }) => (
        <BlogEditor
          supabaseClient={supabase}
          entryType="case_study"
          entityLabel="導入事例"
          newTitle="新規事例を作成"
          editTitle="事例を編集"
          redirectPath="/admin/cms/case-studies"
          storageFolder="case-studies"
        />
      )}
    </AdminProtected>
  );
}

export const dynamic = 'force-dynamic';
