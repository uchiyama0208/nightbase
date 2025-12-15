"use server";

import { getAuthenticatedStoreId } from "./auth";

interface MenuData {
    id: string;
    store_id: string;
    name: string;
    price: number;
    category_id: string | null;
    image_url: string | null;
    is_hidden: boolean;
    stock_enabled?: boolean;
    stock_quantity?: number;
    menu_categories?: MenuCategoryData | null;
}

interface MenuCategoryData {
    id: string;
    store_id: string;
    name: string;
    sort_order: number;
}

/**
 * メニュー一覧を取得（非表示を除く）
 */
export async function getMenus(): Promise<MenuData[]> {
    try {
        const { supabase, storeId } = await getAuthenticatedStoreId();
        const { data: menus, error } = await supabase
            .from("menus")
            .select("*, menu_categories(*)")
            .eq("store_id", storeId)
            .eq("is_hidden", false)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching menus:", error);
            return [];
        }
        return menus || [];
    } catch {
        return [];
    }
}

/**
 * メニューカテゴリ一覧を取得
 */
export async function getMenuCategories(): Promise<MenuCategoryData[]> {
    try {
        const { supabase, storeId } = await getAuthenticatedStoreId();
        const { data: categories, error } = await supabase
            .from("menu_categories")
            .select("*")
            .eq("store_id", storeId)
            .order("sort_order", { ascending: true });

        if (error) {
            console.error("Error fetching menu categories:", error);
            return [];
        }
        return categories || [];
    } catch {
        return [];
    }
}
