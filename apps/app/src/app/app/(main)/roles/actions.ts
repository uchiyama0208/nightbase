"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import type { RoleFormData } from "./constants";

async function getStoreIdAndProfile() {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .single();

    if (!appUser?.current_profile_id) throw new Error("No profile found");

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("id", appUser.current_profile_id)
        .single();

    if (!profile?.store_id) throw new Error("No store found");

    return { storeId: profile.store_id, role: profile.role, profileId: appUser.current_profile_id };
}

export async function createRole(data: RoleFormData) {
    const supabase = await createServerClient() as any;
    const { storeId, role } = await getStoreIdAndProfile();

    // adminのみ作成可能
    if (role !== "admin") {
        throw new Error("権限がありません");
    }

    const { error } = await supabase.from("store_roles").insert({
        store_id: storeId,
        name: data.name,
        for_role: data.for_role,
        permissions: data.permissions,
    });

    if (error) throw new Error(error.message);
    revalidatePath("/app/roles");
    return { success: true };
}

export async function updateRole(id: string, data: RoleFormData) {
    const supabase = await createServerClient() as any;
    const { storeId, role } = await getStoreIdAndProfile();

    // adminのみ更新可能
    if (role !== "admin") {
        throw new Error("権限がありません");
    }

    // Check if role is a system role
    const { data: existingRole, error: fetchError } = await supabase
        .from("store_roles")
        .select("is_system_role")
        .eq("id", id)
        .eq("store_id", storeId)
        .single();

    if (fetchError || !existingRole) throw new Error("Role not found");

    if (existingRole.is_system_role) {
        throw new Error("システムロールは変更できません");
    }

    const { error } = await supabase
        .from("store_roles")
        .update({
            name: data.name,
            for_role: data.for_role,
            permissions: data.permissions,
        })
        .eq("id", id)
        .eq("store_id", storeId);

    if (error) throw new Error(error.message);
    revalidatePath("/app/roles");
    return { success: true };
}

export async function deleteRole(id: string) {
    const supabase = await createServerClient() as any;
    const { storeId, role } = await getStoreIdAndProfile();

    // adminのみ削除可能
    if (role !== "admin") {
        throw new Error("権限がありません");
    }

    // Check if role is a system role
    const { data: existingRole, error: fetchError } = await supabase
        .from("store_roles")
        .select("is_system_role")
        .eq("id", id)
        .eq("store_id", storeId)
        .single();

    if (fetchError || !existingRole) throw new Error("Role not found");

    if (existingRole.is_system_role) {
        throw new Error("システムロールは削除できません");
    }

    const { error } = await supabase
        .from("store_roles")
        .delete()
        .eq("id", id)
        .eq("store_id", storeId);

    if (error) throw new Error(error.message);
    revalidatePath("/app/roles");
    return { success: true };
}

export async function assignRoleToProfile(profileId: string, roleId: string | null) {
    const supabase = await createServerClient() as any;
    const { storeId, role } = await getStoreIdAndProfile();

    // adminのみ割り当て可能
    if (role !== "admin") {
        throw new Error("権限がありません");
    }

    // Verify profile belongs to store
    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", profileId)
        .single();

    if (!profile || profile.store_id !== storeId) {
        throw new Error("Invalid profile");
    }

    const { error } = await supabase
        .from("profiles")
        .update({ role_id: roleId })
        .eq("id", profileId);

    if (error) throw new Error(error.message);
    revalidatePath("/app/roles");
    return { success: true };
}

// スタッフにadmin権限を付与/剥奪
export async function setAdminRole(profileId: string, isAdmin: boolean) {
    const supabase = await createServerClient() as any;
    const { storeId, role, profileId: currentProfileId } = await getStoreIdAndProfile();

    // adminのみ変更可能
    if (role !== "admin") {
        throw new Error("権限がありません");
    }

    // 自分自身のadminは剥奪できない
    if (profileId === currentProfileId && !isAdmin) {
        throw new Error("自分自身のadmin権限は剥奪できません");
    }

    // Verify profile belongs to store
    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role")
        .eq("id", profileId)
        .single();

    if (!profile || profile.store_id !== storeId) {
        throw new Error("Invalid profile");
    }

    // staffにのみadminを付与可能（cast/guestには付与不可）
    if (isAdmin && profile.role !== "staff" && profile.role !== "admin") {
        throw new Error("スタッフ以外にはadmin権限を付与できません");
    }

    const { error } = await supabase
        .from("profiles")
        .update({ role: isAdmin ? "admin" : "staff" })
        .eq("id", profileId);

    if (error) throw new Error(error.message);
    revalidatePath("/app/roles");
    return { success: true };
}

export async function getRoles(storeId?: string) {
    const supabase = await createServerClient() as any;

    if (!storeId) {
        const { storeId: currentStoreId } = await getStoreIdAndProfile();
        storeId = currentStoreId;
    }

    const { data: roles, error } = await supabase
        .from("store_roles")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching roles:", error);
        return [];
    }

    return roles;
}

export async function getRolesPageData() {
    const supabase = await createServerClient() as any;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { redirect: "/login" };
    }

    // Resolve current profile via users.current_profile_id
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) {
        return { redirect: "/app/me" };
    }

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("*, stores(*)")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile || !currentProfile.store_id) {
        return { redirect: "/app/me" };
    }

    // Role check - admin または staff のみアクセス可能
    if (!["admin", "staff"].includes(currentProfile.role)) {
        return { redirect: "/app/timecard" };
    }

    // Parallelize fetches
    const [rolesResult, profilesResult] = await Promise.all([
        supabase
            .from("store_roles")
            .select("*")
            .eq("store_id", currentProfile.store_id)
            .order("created_at", { ascending: true }),
        supabase
            .from("profiles")
            .select("id, display_name, real_name, role_id, role, avatar_url")
            .eq("store_id", currentProfile.store_id)
            .in("role", ["admin", "staff", "cast"])
    ]);

    const roles = rolesResult.data;
    const rolesError = rolesResult.error;
    const profiles = profilesResult.data;
    const profilesError = profilesResult.error;

    if (rolesError) {
        console.error("Error fetching roles:", rolesError);
        throw new Error(rolesError.message);
    }

    if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
    }

    return {
        data: {
            roles: roles || [],
            profiles: profiles || [],
            currentProfileId: appUser.current_profile_id,
            currentRole: currentProfile.role,
        }
    };
}
