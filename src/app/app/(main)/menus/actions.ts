"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

export interface Menu {
    id: string;
    store_id: string;
    name: string;
    category: string;
    price: number;
    created_at: string;
    updated_at: string;
}

export async function getMenus() {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    console.log("[getMenus] user:", user?.id);
    if (!user) return [];

    // Get current user's store
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    console.log("[getMenus] appUser:", appUser);
    if (!appUser?.current_profile_id) return [];

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    console.log("[getMenus] currentProfile:", currentProfile);
    if (!currentProfile?.store_id) return [];

    const { data: menus, error } = await supabase
        .from("menus")
        .select("*")
        .eq("store_id", currentProfile.store_id)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

    console.log("[getMenus] store_id:", currentProfile.store_id);
    console.log("[getMenus] menus count:", menus?.length);
    console.log("[getMenus] menus data:", menus);
    console.log("[getMenus] error:", error);

    if (error) {
        console.error("Error fetching menus:", error);
        return [];
    }

    return menus as Menu[];
}

export async function getMenuCategories() {
    const menus = await getMenus();
    const categories = new Set(menus.map((m) => m.category));
    return Array.from(categories).sort();
}

async function checkMenuPermission() {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) throw new Error("No profile found");

    const { data: profile } = await supabase
        .from("profiles")
        .select("store_id, role_id, role")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!profile?.store_id) throw new Error("No store found");

    console.log("[checkMenuPermission] profile:", {
        role: profile.role,
        role_id: profile.role_id,
        store_id: profile.store_id
    });

    // Check permissions
    if (profile.role_id) {
        const { data: role } = await supabase
            .from("store_roles")
            .select("permissions")
            .eq("id", profile.role_id)
            .single();

        console.log("[checkMenuPermission] store_role permissions:", role?.permissions);

        if (!role?.permissions?.can_manage_menus) {
            console.log("[checkMenuPermission] Missing can_manage_menus permission, checking role fallback");
            // Fallback: if store_role doesn't have the permission, check the base role
            if (profile.role !== "staff") {
                throw new Error("Insufficient permissions");
            }
            console.log("[checkMenuPermission] Allowed via staff role fallback");
        }
    } else {
        console.log("[checkMenuPermission] No role_id, using legacy role check");
        // Fallback for legacy roles: only staff can manage menus if no granular role assigned
        if (profile.role !== "staff") {
            throw new Error("Insufficient permissions");
        }
    }

    return profile;
}

export async function createMenu(formData: FormData) {
    const supabase = await createServerClient();
    const profile = await checkMenuPermission();

    const name = formData.get("name") as string;
    const category = formData.get("category") as string;
    const price = parseInt(formData.get("price") as string);

    if (!name || !category || isNaN(price)) {
        throw new Error("Invalid input");
    }

    const { error } = await supabase.from("menus").insert({
        store_id: profile.store_id,
        name,
        category,
        price,
    });

    if (error) {
        console.error("Error creating menu:", error);
        throw new Error("Failed to create menu");
    }

    revalidatePath("/app/menus");
    return { success: true };
}

export async function updateMenu(formData: FormData) {
    const supabase = await createServerClient();
    await checkMenuPermission();

    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const category = formData.get("category") as string;
    const price = parseInt(formData.get("price") as string);

    if (!id || !name || !category || isNaN(price)) {
        throw new Error("Invalid input");
    }

    const { error } = await supabase
        .from("menus")
        .update({
            name,
            category,
            price,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id);

    if (error) {
        console.error("Error updating menu:", error);
        throw new Error("Failed to update menu");
    }

    revalidatePath("/app/menus");
    return { success: true };
}

export async function deleteMenu(id: string) {
    const supabase = await createServerClient();
    await checkMenuPermission();

    const { error } = await supabase.from("menus").delete().eq("id", id);

    if (error) {
        console.error("Error deleting menu:", error);
        throw new Error("Failed to delete menu");
    }

    revalidatePath("/app/menus");
    return { success: true };
}

export async function getMenusData() {
    const supabase = await createServerClient();
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

    // Role check
    if (currentProfile.role !== "staff") {
        return { redirect: "/app/timecard" };
    }

    const menus = await getMenus();
    const categories = await getMenuCategories();

    return {
        data: {
            menus,
            categories,
        }
    };
}
