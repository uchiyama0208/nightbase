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

    const { data: newRole, error } = await supabase.from("store_roles").insert({
        store_id: storeId,
        name: data.name,
        for_role: data.for_role,
        permissions: data.permissions,
    }).select("id").single();

    if (error) throw new Error(error.message);
    revalidatePath("/app/roles");
    return { success: true, id: newRole?.id };
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
    const [rolesResult, profilesResult, storeSettingsResult] = await Promise.all([
        supabase
            .from("store_roles")
            .select("*")
            .eq("store_id", currentProfile.store_id)
            .order("created_at", { ascending: true }),
        supabase
            .from("profiles")
            .select("id, display_name, real_name, role_id, role, avatar_url")
            .eq("store_id", currentProfile.store_id)
            .in("role", ["admin", "staff", "cast"]),
        supabase
            .from("store_settings")
            .select(`
                show_attendance, show_pickup, show_timecard, show_shifts, show_my_shifts,
                show_users, show_resumes, show_invitations, show_roles,
                show_floor, show_orders, show_queue, show_reservations, show_seats, show_slips, show_menus, show_bottles, show_shopping,
                show_sales, show_payroll, show_ranking, show_pricing_systems, show_salary_systems,
                show_board, show_sns, show_ai_create, show_services
            `)
            .eq("store_id", currentProfile.store_id)
            .maybeSingle()
    ]);

    const roles = rolesResult.data;
    const rolesError = rolesResult.error;
    const profiles = profilesResult.data;
    const profilesError = profilesResult.error;
    const storeSettings = storeSettingsResult.data;

    if (rolesError) {
        console.error("Error fetching roles:", rolesError);
        throw new Error(rolesError.message);
    }

    if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
    }

    // Build storeFeatures with defaults
    const storeFeatures = storeSettings ? {
        show_attendance: storeSettings.show_attendance ?? true,
        show_pickup: storeSettings.show_pickup ?? true,
        show_timecard: storeSettings.show_timecard ?? true,
        show_shifts: storeSettings.show_shifts ?? true,
        show_my_shifts: storeSettings.show_my_shifts ?? true,
        show_users: storeSettings.show_users ?? true,
        show_resumes: storeSettings.show_resumes ?? true,
        show_invitations: storeSettings.show_invitations ?? true,
        show_roles: storeSettings.show_roles ?? true,
        show_floor: storeSettings.show_floor ?? true,
        show_orders: storeSettings.show_orders ?? true,
        show_queue: storeSettings.show_queue ?? true,
        show_reservations: storeSettings.show_reservations ?? true,
        show_seats: storeSettings.show_seats ?? true,
        show_slips: storeSettings.show_slips ?? true,
        show_menus: storeSettings.show_menus ?? true,
        show_bottles: storeSettings.show_bottles ?? true,
        show_shopping: storeSettings.show_shopping ?? true,
        show_sales: storeSettings.show_sales ?? true,
        show_payroll: storeSettings.show_payroll ?? true,
        show_ranking: storeSettings.show_ranking ?? true,
        show_pricing_systems: storeSettings.show_pricing_systems ?? true,
        show_salary_systems: storeSettings.show_salary_systems ?? true,
        show_board: storeSettings.show_board ?? true,
        show_sns: storeSettings.show_sns ?? true,
        show_ai_create: storeSettings.show_ai_create ?? true,
        show_services: storeSettings.show_services ?? true,
    } : null;

    return {
        data: {
            roles: roles || [],
            profiles: profiles || [],
            currentProfileId: appUser.current_profile_id,
            currentRole: currentProfile.role,
            storeFeatures,
        }
    };
}
