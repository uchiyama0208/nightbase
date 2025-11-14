import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabaseClient";

function isAdmin(user: { user_metadata?: Record<string, any>; app_metadata?: Record<string, any> } | null) {
  if (!user) {
    return false;
  }

  const role = user.user_metadata?.role ?? user.app_metadata?.role;
  return role === "admin";
}

export async function requireAdminUser() {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("管理者ユーザーの取得に失敗しました", error);
    redirect("/");
  }

  const user = data.user;

  if (!isAdmin(user)) {
    redirect("/");
  }

  return user;
}

export async function createAdminServerClient() {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error("認証情報の取得に失敗しました");
  }

  const user = data.user;

  if (!isAdmin(user)) {
    throw new Error("この操作を行う権限がありません");
  }

  return { supabase, user };
}
