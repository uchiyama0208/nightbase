import { redirect } from "next/navigation";

import type { User } from "@supabase/supabase-js";

import { createServerClient } from "@/lib/supabaseServerClient";
import type { Database } from "@/types/supabase";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

const CMS_ROLES = new Set(["admin", "editor"]);

async function getProfileForUser(supabase: any, userId: string) {
  const client = supabase as any;

  const { data, error } = await client
    .from("profiles")
    .select("id, user_id, email, display_name, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("profiles テーブルからの取得に失敗しました", error);
    return null;
  }

  return data;
}

function assertCmsAccess(user: User | null, profile: ProfileRow | null) {
  if (!user || !profile) {
    return false;
  }

  return CMS_ROLES.has(profile.role);
}

export async function requireAdminUser() {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("管理者ユーザーの取得に失敗しました", error);
    redirect("/");
  }

  const user = data.user;
  if (!user) {
    redirect("/");
  }

  const profile = await getProfileForUser(supabase, user.id);

  if (!assertCmsAccess(user, profile)) {
    redirect("/");
  }

  return { user, profile: profile! };
}

export async function createAdminServerClient() {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error("認証情報の取得に失敗しました");
  }

  const user = data.user;

  if (!user) {
    throw new Error("認証ユーザーが見つかりません");
  }

  const profile = await getProfileForUser(supabase, user.id);

  if (!assertCmsAccess(user, profile)) {
    throw new Error("この操作を行う権限がありません");
  }

  return { supabase, user, profile: profile! };
}
