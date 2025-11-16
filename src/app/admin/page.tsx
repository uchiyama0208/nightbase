"use client";

import { AdminDashboard } from "@/app/admin/dashboard";
import { AdminProtected } from "@/components/admin/AdminProtected";

export default function AdminPage() {
  return (
    <AdminProtected>
      {({ supabase }) => <AdminDashboard supabaseClient={supabase} />}
    </AdminProtected>
  );
}
