"use client";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { BlogEditor } from "@/components/admin/cms/BlogEditor";

export default function AdminManualCreatePage() {
  return (
    <AdminProtected>
      {({ supabase }) => (
        <BlogEditor
          supabaseClient={supabase}
          entryType="manual"
          entityLabel="マニュアル"
          newTitle="新規マニュアルを作成"
          editTitle="マニュアルを編集"
          redirectPath="/admin/cms/manuals"
          storageFolder="manuals"
        />
      )}
    </AdminProtected>
  );
}
