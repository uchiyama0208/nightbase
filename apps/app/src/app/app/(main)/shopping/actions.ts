"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import {
    getAuthContext,
    getAuthContextForPage,
    logQueryError,
} from "@/lib/auth-helpers";

export interface ShoppingItem {
    id: string;
    store_id: string;
    name: string;
    quantity: number;
    menu_id: string | null;
    is_completed: boolean;
    created_at: string;
    updated_at: string;
    menu?: {
        id: string;
        name: string;
        stock_quantity: number;
        stock_alert_threshold: number;
    };
}

export interface LowStockMenu {
    id: string;
    name: string;
    stock_quantity: number;
    stock_alert_threshold: number;
    category?: { name: string };
}

// 買い出しリストを取得
export async function getShoppingList() {
    try {
        const { supabase, storeId } = await getAuthContext();

        const { data, error } = await supabase
            .from("shopping_list")
            .select(`
                *,
                menu:menus(id, name, stock_quantity, stock_alert_threshold)
            `)
            .eq("store_id", storeId)
            .order("is_completed", { ascending: true })
            .order("created_at", { ascending: false });

        if (error) {
            logQueryError(error, "fetching shopping list");
            return [];
        }

        return data as ShoppingItem[];
    } catch {
        return [];
    }
}

// 低在庫メニューを取得
export async function getLowStockMenus() {
    try {
        const { supabase, storeId } = await getAuthContext();

        // Get all stock-enabled menus and filter in JS
        // (Supabase doesn't support comparing two columns)
        const { data, error } = await supabase
            .from("menus")
            .select(`
                id, name, stock_quantity, stock_alert_threshold,
                category:menu_categories(name)
            `)
            .eq("store_id", storeId)
            .eq("stock_enabled", true);

        if (error) {
            logQueryError(error, "fetching low stock menus");
            return [];
        }

        // Filter for low stock: quantity <= threshold or quantity = 0
        const filtered = (data || []).filter(menu =>
            menu.stock_quantity === 0 || menu.stock_quantity <= (menu.stock_alert_threshold ?? 3)
        );

        // Transform to expected shape (category is single object from join, not array)
        return filtered.map(menu => ({
            id: menu.id,
            name: menu.name,
            stock_quantity: menu.stock_quantity,
            stock_alert_threshold: menu.stock_alert_threshold,
            category: Array.isArray(menu.category) ? menu.category[0] : menu.category,
        })) as LowStockMenu[];
    } catch {
        return [];
    }
}

// 買い出しアイテムを追加
export async function addShoppingItem(formData: FormData) {
    const { supabase, storeId } = await getAuthContext();

    const name = formData.get("name") as string;
    const quantity = parseInt(formData.get("quantity") as string) || 1;
    const menuId = formData.get("menu_id") as string | null;

    if (!name) {
        throw new Error("商品名を入力してください");
    }

    const { error } = await supabase.from("shopping_list").insert({
        store_id: storeId,
        name,
        quantity,
        menu_id: menuId || null,
        is_completed: false,
    });

    if (error) {
        console.error("Error adding shopping item:", error);
        throw new Error("追加に失敗しました");
    }

    revalidatePath("/app/shopping");
    return { success: true };
}

// 低在庫メニューを買い出しリストに追加
export async function addLowStockToShoppingList(menuIds: string[]) {
    const { supabase, storeId } = await getAuthContext();

    // Get menu details
    const { data: menus, error: fetchError } = await supabase
        .from("menus")
        .select("id, name")
        .in("id", menuIds);

    if (fetchError || !menus) {
        throw new Error("メニュー情報の取得に失敗しました");
    }

    // Check for existing items
    const { data: existing } = await supabase
        .from("shopping_list")
        .select("menu_id")
        .eq("store_id", storeId)
        .eq("is_completed", false)
        .in("menu_id", menuIds);

    const existingMenuIds = new Set((existing || []).map(e => e.menu_id));
    const newMenus = menus.filter(m => !existingMenuIds.has(m.id));

    if (newMenus.length === 0) {
        return { success: true, added: 0, message: "すべて既にリストに追加済みです" };
    }

    const items = newMenus.map(menu => ({
        store_id: storeId,
        name: menu.name,
        quantity: 1,
        menu_id: menu.id,
        is_completed: false,
    }));

    const { error } = await supabase.from("shopping_list").insert(items);

    if (error) {
        console.error("Error adding shopping items:", error);
        throw new Error("追加に失敗しました");
    }

    revalidatePath("/app/shopping");
    return { success: true, added: newMenus.length };
}

// 買い出しアイテムを完了/未完了に切り替え
export async function toggleShoppingItem(id: string, isCompleted: boolean) {
    const { supabase } = await getAuthContext();

    const { error } = await supabase
        .from("shopping_list")
        .update({ is_completed: isCompleted, updated_at: new Date().toISOString() })
        .eq("id", id);

    if (error) {
        console.error("Error toggling shopping item:", error);
        throw new Error("更新に失敗しました");
    }

    revalidatePath("/app/shopping");
    return { success: true };
}

// 買い出しアイテムを削除
export async function deleteShoppingItem(id: string) {
    const { supabase } = await getAuthContext();

    const { error } = await supabase
        .from("shopping_list")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting shopping item:", error);
        throw new Error("削除に失敗しました");
    }

    revalidatePath("/app/shopping");
    return { success: true };
}

// 完了済みアイテムをすべて削除
export async function clearCompletedItems() {
    const { supabase, storeId } = await getAuthContext();

    const { error } = await supabase
        .from("shopping_list")
        .delete()
        .eq("store_id", storeId)
        .eq("is_completed", true);

    if (error) {
        console.error("Error clearing completed items:", error);
        throw new Error("削除に失敗しました");
    }

    revalidatePath("/app/shopping");
    return { success: true };
}

// 完了時にメニューの在庫を補充
export async function replenishStock(itemId: string, addQuantity: number) {
    const { supabase } = await getAuthContext();

    // Get the shopping item with menu info
    const { data: item, error: fetchError } = await supabase
        .from("shopping_list")
        .select("menu_id, menu:menus(stock_quantity)")
        .eq("id", itemId)
        .single();

    if (fetchError || !item?.menu_id) {
        throw new Error("アイテム情報の取得に失敗しました");
    }

    const currentStock = (item.menu as any)?.stock_quantity || 0;
    const newStock = currentStock + addQuantity;

    // Update menu stock
    const { error: updateError } = await supabase
        .from("menus")
        .update({ stock_quantity: newStock })
        .eq("id", item.menu_id);

    if (updateError) {
        console.error("Error updating stock:", updateError);
        throw new Error("在庫の更新に失敗しました");
    }

    // Mark item as completed
    await supabase
        .from("shopping_list")
        .update({ is_completed: true, updated_at: new Date().toISOString() })
        .eq("id", itemId);

    revalidatePath("/app/shopping");
    revalidatePath("/app/menus");
    return { success: true, newStock };
}

// ページデータ取得
export async function getShoppingPageData() {
    const result = await getAuthContextForPage({ requireStaff: true });

    if ("redirect" in result) {
        return result;
    }

    const [shoppingList, lowStockMenus] = await Promise.all([
        getShoppingList(),
        getLowStockMenus(),
    ]);

    return {
        data: {
            shoppingList,
            lowStockMenus,
        }
    };
}
