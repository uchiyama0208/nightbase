"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";

export interface MenuCategory {
    id: string;
    store_id: string;
    name: string;
    sort_order: number;
    created_at: string;
}

export interface Menu {
    id: string;
    store_id: string;
    name: string;
    category_id: string;
    price: number;
    created_at: string;
    updated_at: string;
    category?: MenuCategory; // Joined category data
}

export async function getMenus() {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    // Get current user's store
    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) return [];

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile?.store_id) return [];

    const { data: menus, error } = await supabase
        .from("menus")
        .select(`
            *,
            category:menu_categories(*)
        `)
        .eq("store_id", currentProfile.store_id)
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching menus:", error);
        return [];
    }

    // Sort by category sort_order manually since we can't easily sort by joined table column in simple query without RPC or complex syntax
    // actually we can sort by foreign table column in supabase js: .order('sort_order', { foreignTable: 'category', ascending: true })
    // But let's do it in JS for simplicity if needed, or try the foreign table sort.
    // Let's try JS sort for reliability.
    const sortedMenus = (menus as any[]).sort((a, b) => {
        const orderA = a.category?.sort_order ?? 0;
        const orderB = b.category?.sort_order ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
    });

    return sortedMenus as Menu[];
}

export async function getMenuCategories() {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: appUser } = await supabase
        .from("users")
        .select("current_profile_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!appUser?.current_profile_id) return [];

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", appUser.current_profile_id)
        .maybeSingle();

    if (!currentProfile?.store_id) return [];

    const { data: categories, error } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("store_id", currentProfile.store_id)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("Error fetching menu categories:", error);
        return [];
    }

    return categories as MenuCategory[];
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

    // Check permissions
    if (profile.role_id) {
        const { data: role } = await supabase
            .from("store_roles")
            .select("permissions")
            .eq("id", profile.role_id)
            .single();

        if (!role?.permissions?.can_manage_menus) {
            // Fallback: if store_role doesn't have the permission, check the base role
            if (profile.role !== "staff") {
                throw new Error("Insufficient permissions");
            }
        }
    } else {
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
    const categoryId = formData.get("category_id") as string;
    const price = parseInt(formData.get("price") as string);

    if (!name || !categoryId || isNaN(price)) {
        throw new Error("Invalid input");
    }

    const { error } = await supabase.from("menus").insert({
        store_id: profile.store_id,
        name,
        category_id: categoryId,
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
    const categoryId = formData.get("category_id") as string;
    const price = parseInt(formData.get("price") as string);

    if (!id || !name || !categoryId || isNaN(price)) {
        throw new Error("Invalid input");
    }

    const { error } = await supabase
        .from("menus")
        .update({
            name,
            category_id: categoryId,
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

// Category Management Actions

export async function createMenuCategory(name: string) {
    const supabase = await createServerClient();
    const profile = await checkMenuPermission();

    // Get max sort order
    const { data: maxOrderData } = await supabase
        .from("menu_categories")
        .select("sort_order")
        .eq("store_id", profile.store_id)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

    const nextOrder = (maxOrderData?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
        .from("menu_categories")
        .insert({
            store_id: profile.store_id,
            name,
            sort_order: nextOrder
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating menu category:", error);
        throw new Error("Failed to create category");
    }

    revalidatePath("/app/menus");
    return { success: true, category: data };
}

export async function updateMenuCategory(id: string, name: string) {
    const supabase = await createServerClient();
    await checkMenuPermission();

    const { error } = await supabase
        .from("menu_categories")
        .update({ name })
        .eq("id", id);

    if (error) {
        console.error("Error updating menu category:", error);
        throw new Error("Failed to update category");
    }

    revalidatePath("/app/menus");
    return { success: true };
}

export async function deleteMenuCategory(id: string) {
    const supabase = await createServerClient();
    await checkMenuPermission();

    const { error } = await supabase
        .from("menu_categories")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting menu category:", error);
        throw new Error("Failed to delete category");
    }

    revalidatePath("/app/menus");
    return { success: true };
}

export async function reorderMenuCategories(items: { id: string; sort_order: number }[]) {
    const supabase = await createServerClient();
    await checkMenuPermission();

    // Upsert sort orders
    // Since we can't easily do bulk update with different values in one query without RPC,
    // we'll loop or use upsert if we include all required fields.
    // But upsert requires all non-null fields or defaults.
    // Let's loop for now, it's usually small number of categories.

    for (const item of items) {
        await supabase
            .from("menu_categories")
            .update({ sort_order: item.sort_order })
            .eq("id", item.id);
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

export async function importMenusFromCsv(formData: FormData) {
    const supabase = await createServerClient();
    const profile = await checkMenuPermission();

    const file = formData.get("file") as File;
    const categoryId = formData.get("categoryId") as string;

    if (!file || !categoryId) {
        throw new Error("File and category are required");
    }

    const text = await file.text();
    const lines = text.split("\n").filter(line => line.trim());

    if (lines.length < 2) {
        throw new Error("CSV must have header and at least one data row");
    }

    // Parse header
    const header = lines[0].split(",").map(h => h.trim().toLowerCase());
    const nameIdx = header.indexOf("name");
    const priceIdx = header.indexOf("price");

    if (nameIdx === -1 || priceIdx === -1) {
        throw new Error("CSV must have 'name' and 'price' columns");
    }

    // Parse data rows
    const menusToInsert = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        const name = values[nameIdx];
        const priceStr = values[priceIdx];

        if (!name || !priceStr) continue;

        const price = parseInt(priceStr);
        if (isNaN(price)) continue;

        menusToInsert.push({
            store_id: profile.store_id,
            name,
            category_id: categoryId,
            price,
        });
    }

    if (menusToInsert.length === 0) {
        throw new Error("No valid menu items found in CSV");
    }

    // Insert menus
    const { error } = await supabase.from("menus").insert(menusToInsert);

    if (error) {
        console.error("Error importing menus:", error);
        throw new Error("Failed to import menus");
    }

    revalidatePath("/app/menus");
    revalidatePath("/app/settings/import");
    return { success: true, count: menusToInsert.length };
}
