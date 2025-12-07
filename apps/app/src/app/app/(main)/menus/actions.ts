"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import {
    getAuthContext,
    getAuthContextForPage,
    getAuthUser,
    logQueryError,
} from "@/lib/auth-helpers";

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
    target_type: "guest" | "cast";
    cast_back_amount: number;
    hide_from_slip: boolean;
    image_url: string | null;
    created_at: string;
    updated_at: string;
    category?: MenuCategory;
}

export async function getMenus() {
    try {
        const { supabase, storeId } = await getAuthContext();

        const { data: menus, error } = await supabase
            .from("menus")
            .select(`*, category:menu_categories(*)`)
            .eq("store_id", storeId)
            .order("name", { ascending: true });

        if (error) {
            logQueryError(error, "fetching menus");
            return [];
        }

        // Sort by category sort_order
        const sortedMenus = (menus as Menu[]).sort((a, b) => {
            const orderA = a.category?.sort_order ?? 0;
            const orderB = b.category?.sort_order ?? 0;
            if (orderA !== orderB) return orderA - orderB;
            return a.name.localeCompare(b.name);
        });

        return sortedMenus;
    } catch {
        return [];
    }
}

export async function getMenuCategories() {
    try {
        const { supabase, storeId } = await getAuthContext();

        const { data: categories, error } = await supabase
            .from("menu_categories")
            .select("*")
            .eq("store_id", storeId)
            .order("sort_order", { ascending: true });

        if (error) {
            logQueryError(error, "fetching menu categories");
            return [];
        }

        return categories as MenuCategory[];
    } catch {
        return [];
    }
}

async function checkMenuPermission() {
    return getAuthContext({ permission: "can_manage_menus" });
}

export async function createMenu(formData: FormData) {
    const { supabase, storeId } = await checkMenuPermission();

    const name = formData.get("name") as string;
    const categoryId = formData.get("category_id") as string;
    const price = parseInt(formData.get("price") as string);
    const targetType = (formData.get("target_type") as string) || "guest";
    const castBackAmount = parseInt(formData.get("cast_back_amount") as string) || 0;
    const hideFromSlip = formData.get("hide_from_slip") === "on";
    const imageUrl = formData.get("image_url") as string | null;

    if (!name || !categoryId || isNaN(price)) {
        throw new Error("Invalid input");
    }

    const { data, error } = await supabase.from("menus").insert({
        store_id: storeId,
        name,
        category_id: categoryId,
        price,
        target_type: targetType,
        cast_back_amount: targetType === "cast" ? castBackAmount : 0,
        hide_from_slip: hideFromSlip,
        image_url: imageUrl || null,
    }).select().single();

    if (error) {
        console.error("Error creating menu:", error);
        throw new Error("Failed to create menu");
    }

    revalidatePath("/app/menus");
    return { success: true, menu: data };
}

export async function updateMenu(formData: FormData) {
    const { supabase } = await checkMenuPermission();

    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const categoryId = formData.get("category_id") as string;
    const price = parseInt(formData.get("price") as string);
    const targetType = (formData.get("target_type") as string) || "guest";
    const castBackAmount = parseInt(formData.get("cast_back_amount") as string) || 0;
    const hideFromSlip = formData.get("hide_from_slip") === "on";
    const imageUrl = formData.get("image_url") as string | null;

    if (!id || !name || !categoryId || isNaN(price)) {
        throw new Error("Invalid input");
    }

    const { error } = await supabase
        .from("menus")
        .update({
            name,
            category_id: categoryId,
            price,
            target_type: targetType,
            cast_back_amount: targetType === "cast" ? castBackAmount : 0,
            hide_from_slip: hideFromSlip,
            image_url: imageUrl || null,
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
    const { supabase } = await checkMenuPermission();

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
    const { supabase, storeId } = await checkMenuPermission();

    // Get max sort order
    const { data: maxOrderData } = await supabase
        .from("menu_categories")
        .select("sort_order")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

    const nextOrder = (maxOrderData?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
        .from("menu_categories")
        .insert({
            store_id: storeId,
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
    const { supabase } = await checkMenuPermission();

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
    const { supabase } = await checkMenuPermission();

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
    const { supabase } = await checkMenuPermission();

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
    const result = await getAuthContextForPage({ requireStaff: true });

    if ("redirect" in result) {
        return result;
    }

    const [menus, categories] = await Promise.all([
        getMenus(),
        getMenuCategories(),
    ]);

    return {
        data: {
            menus,
            categories,
        }
    };
}

export async function importMenusFromCsv(formData: FormData) {
    const { supabase, storeId } = await checkMenuPermission();

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
    const menusToInsert: any[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        const name = values[nameIdx];
        const priceStr = values[priceIdx];

        if (!name || !priceStr) continue;

        const price = parseInt(priceStr);
        if (isNaN(price)) continue;

        menusToInsert.push({
            store_id: storeId,
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

// AI読み取り用のメニューアイテム型
export interface ExtractedMenuItem {
    name: string;
    price: number;
}

// 画像からメニューを読み取るAIアクション
export async function extractMenusFromImage(base64Image: string): Promise<ExtractedMenuItem[]> {
    await getAuthUser(); // 認証チェックのみ

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "system",
                content: `あなたはメニュー表の画像からメニュー情報を抽出するアシスタントです。

画像に含まれるメニュー項目を読み取り、以下の形式のJSONで返してください：

{
  "items": [
    { "name": "メニュー名", "price": 1000 },
    ...
  ]
}

注意点：
- nameはメニュー名（商品名）です
- priceは数値（円単位、整数）で返してください
- 価格が読み取れない場合は0としてください
- 飲食店のメニュー表を想定しています（ドリンク、フード、ボトルなど）

必ずJSON形式で返答してください。`
            },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "この画像からメニュー名と価格を読み取ってください。"
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: base64Image,
                        }
                    }
                ]
            }
        ],
        response_format: { type: "json_object" },
        max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error("AIからの応答がありません");
    }

    try {
        const parsed = JSON.parse(content) as { items: ExtractedMenuItem[] };
        return parsed.items || [];
    } catch (e) {
        console.error("Failed to parse AI response:", content);
        throw new Error("AIの応答を解析できませんでした");
    }
}

// 抽出したメニューを一括追加するアクション
export async function bulkCreateMenus(
    items: { name: string; price: number; categoryId: string }[]
) {
    const { supabase, storeId } = await checkMenuPermission();

    if (items.length === 0) {
        throw new Error("追加するメニューがありません");
    }

    const menusToInsert = items.map(item => ({
        store_id: storeId,
        name: item.name,
        category_id: item.categoryId,
        price: item.price,
        target_type: "guest" as const,
        cast_back_amount: 0,
        hide_from_slip: false,
    }));

    const { error } = await supabase.from("menus").insert(menusToInsert);

    if (error) {
        console.error("Error bulk creating menus:", error);
        throw new Error("メニューの追加に失敗しました");
    }

    revalidatePath("/app/menus");
    return { success: true, count: items.length };
}

// メニュー画像をアップロード
export async function uploadMenuImage(formData: FormData): Promise<string> {
    const { supabase } = await getAuthUser();

    const file = formData.get("file") as File;
    if (!file) {
        throw new Error("ファイルが選択されていません");
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `menu-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `menu-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

    if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`アップロードに失敗しました: ${uploadError.message}`);
    }

    // Get Public URL
    const {
        data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    return publicUrl;
}

// メニュー画像を削除
export async function deleteMenuImage(imageUrl: string): Promise<void> {
    const { supabase } = await getAuthUser();

    // Extract file path from URL
    const urlParts = imageUrl.split("/avatars/");
    if (urlParts.length < 2) {
        return; // Not a valid storage URL, skip deletion
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage
        .from("avatars")
        .remove([filePath]);

    if (error) {
        console.error("Delete error:", error);
    }
}

// AIでメニュー画像を生成
export async function generateMenuImage(menuName: string): Promise<string> {
    const { supabase } = await getAuthUser();

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    // DALL-E 3で画像を生成
    const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: `A clean product photo of "${menuName}" on a bar counter. The item is very large, centered, and fills 70% of the frame. Simple blurred bar background with subtle warm ambient lighting. Minimal composition. The product is the sole focus. Sharp focus on the item, extremely blurred background. Professional bar photography style.`,
        n: 1,
        size: "1024x1024",
        quality: "standard",
    });

    const generatedUrl = response.data?.[0]?.url;
    if (!generatedUrl) {
        throw new Error("画像の生成に失敗しました");
    }

    // 生成された画像をダウンロードしてSupabase Storageに保存
    const imageResponse = await fetch(generatedUrl);
    const imageBlob = await imageResponse.blob();

    const fileName = `menu-ai-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const filePath = `menu-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, imageBlob, {
            contentType: "image/png",
        });

    if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`画像の保存に失敗しました: ${uploadError.message}`);
    }

    // Get Public URL
    const {
        data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    return publicUrl;
}
