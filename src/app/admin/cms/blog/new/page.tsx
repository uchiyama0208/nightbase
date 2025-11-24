"use client";

import { AdminProtected } from "@/components/admin/AdminProtected";
import { BlogEditor } from "@/components/admin/cms/BlogEditor";

export default function AdminBlogCreatePage() {
  return (
    <AdminProtected>
      {({ supabase }) => <BlogEditor supabaseClient={supabase} />}
    </AdminProtected>
  );
}

export const dynamic = 'force-dynamic';
