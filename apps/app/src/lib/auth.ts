import { redirect } from "next/navigation";

import type { User } from "@supabase/supabase-js";

import { createServerClient } from "@/lib/supabaseServerClient";
import type { Database } from "@/types/supabase";
import type { PageKey, PermissionLevel } from "@/app/app/(main)/roles/constants";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type PagePermissions = { [key in PageKey]?: PermissionLevel };

const CMS_ROLES = new Set(["admin", "editor"]);

async function getProfileForUser(supabase: any, userId: string) {
  const client = supabase as any;

  const { data, error } = await client
    .from("profiles")
    .select("*")
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

export async function getCurrentUserProfile() {
  const supabase = await createServerClient() as any;
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("現在のユーザー情報の取得に失敗しました", error);
    return { user: null, profile: null };
  }

  const user = data.user;

  if (!user) {
    return { user: null, profile: null };
  }

  const profile = await getProfileForUser(supabase, user.id);

  return { user, profile: profile ?? null };
}

export async function requireAdminUser() {
  const supabase = await createServerClient() as any;
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
  const supabase = await createServerClient() as any;
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

/**
 * Get auth context for server actions with page permission check
 * Use this in server actions that modify data
 */
export async function getAuthContextWithPermission(
  pageKey: PageKey,
  requiredLevel: "view" | "edit" = "edit"
) {
  const supabase = await createServerClient() as any;
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("認証されていません");
  }

  const user = data.user;

  // Get current profile ID from users table
  const { data: appUser } = await supabase
    .from("users")
    .select("current_profile_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!appUser?.current_profile_id) {
    throw new Error("プロフィールが見つかりません");
  }

  // Get profile with permissions
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*, store_roles(permissions)")
    .eq("id", appUser.current_profile_id)
    .maybeSingle();

  if (!profileData) {
    throw new Error("プロフィールが見つかりません");
  }

  const profile = profileData as ProfileRow & { store_roles?: { permissions: PagePermissions } | null };
  const permissions = profile.store_roles?.permissions || null;

  // Check permission
  const hasPermission = checkPagePermission(pageKey, requiredLevel, profile, permissions);

  if (!hasPermission) {
    const levelText = requiredLevel === "edit" ? "編集" : "閲覧";
    throw new Error(`このページの${levelText}権限がありません`);
  }

  return { supabase, user, profile, storeId: profile.store_id };
}

/**
 * Check if user has permission to access a page
 */
function checkPagePermission(
  pageKey: PageKey,
  requiredLevel: "view" | "edit",
  profile: ProfileRow,
  permissions: PagePermissions | null
): boolean {
  // admin always has full access
  if (profile.role === "admin") return true;

  // If no role_id is set, deny by default
  if (!profile.role_id || !permissions) {
    return false;
  }

  const permission = permissions[pageKey];

  if (!permission || permission === "none") return false;
  if (requiredLevel === "view") return permission === "view" || permission === "edit";
  if (requiredLevel === "edit") return permission === "edit";

  return false;
}
