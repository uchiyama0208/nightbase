"use server";

import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import {
    getAuthContext,
    getAuthContextForPage,
    getAuthUser,
    logQueryError,
} from "@/lib/auth-helpers";
import type {
    Menu,
    MenuCategory,
    ExtractedMenuItem,
    MenusDataResult,
    MenuCreatePayload,
    MenuUpdatePayload,
    CategorySortOrderUpdate,
    BulkMenuCreateItem,
    MenuOption,
    MenuOptionChoice,
    MenuOptionLink,
    MenuOptionInput,
    MenuOptionChoiceInput,
} from "./types";

// 型の再エクスポート（後方互換性のため）
export type { Menu, MenuCategory, ExtractedMenuItem, MenuOption, MenuOptionChoice, MenuOptionLink, MenuOptionInput, MenuOptionChoiceInput } from "./types";

// ============================================
// 権限チェック
// ============================================

/**
 * メニュー管理権限をチェック
 */
async function checkMenuPermission() {
    return getAuthContext({ permission: "can_manage_menus" });
}

// ============================================
// メニュー取得
// ============================================

/**
 * 店舗のメニュー一覧を取得
 */
export async function getMenus(): Promise<Menu[]> {
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

        // カテゴリのsort_orderでソート
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

/**
 * 店舗のメニューカテゴリ一覧を取得
 */
export async function getMenuCategories(): Promise<MenuCategory[]> {
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

/**
 * メニューページ用のデータを取得
 */
export async function getMenusData(): Promise<MenusDataResult> {
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

// ============================================
// メニュー作成・更新・削除
// ============================================

/**
 * メニューを新規作成
 */
export async function createMenu(formData: FormData): Promise<{ success: boolean; menu?: Menu }> {
    const { supabase, storeId } = await checkMenuPermission();

    const name = formData.get("name") as string;
    const categoryId = formData.get("category_id") as string;
    const price = parseInt(formData.get("price") as string);
    const targetType = (formData.get("target_type") as string) || "guest";
    const castBackAmount = parseInt(formData.get("cast_back_amount") as string) || 0;
    const hideFromSlip = formData.get("hide_from_slip") === "on";
    const isHidden = formData.get("is_hidden") === "on";
    const imageUrl = formData.get("image_url") as string | null;
    const stockEnabled = formData.get("stock_enabled") === "on";
    const stockQuantity = parseInt(formData.get("stock_quantity") as string) || 0;
    const stockAlertThreshold = parseInt(formData.get("stock_alert_threshold") as string) || 3;

    if (!name || !categoryId || isNaN(price)) {
        throw new Error("Invalid input");
    }

    const payload: MenuCreatePayload = {
        store_id: storeId,
        name,
        category_id: categoryId,
        price,
        target_type: targetType as "guest" | "cast",
        cast_back_amount: targetType === "cast" ? castBackAmount : 0,
        hide_from_slip: hideFromSlip,
        is_hidden: isHidden,
        image_url: imageUrl || null,
        stock_enabled: stockEnabled,
        stock_quantity: stockEnabled ? stockQuantity : 0,
        stock_alert_threshold: stockEnabled ? stockAlertThreshold : 3,
    };

    const { data, error } = await supabase
        .from("menus")
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error("Error creating menu:", error);
        throw new Error("Failed to create menu");
    }

    revalidatePath("/app/menus");
    return { success: true, menu: data as Menu };
}

/**
 * メニューを更新
 */
export async function updateMenu(formData: FormData): Promise<{ success: boolean }> {
    const { supabase } = await checkMenuPermission();

    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const categoryId = formData.get("category_id") as string;
    const price = parseInt(formData.get("price") as string);
    const targetType = (formData.get("target_type") as string) || "guest";
    const castBackAmount = parseInt(formData.get("cast_back_amount") as string) || 0;
    const hideFromSlip = formData.get("hide_from_slip") === "on";
    const isHidden = formData.get("is_hidden") === "on";
    const imageUrl = formData.get("image_url") as string | null;
    const stockEnabled = formData.get("stock_enabled") === "on";
    const stockQuantity = parseInt(formData.get("stock_quantity") as string) || 0;
    const stockAlertThreshold = parseInt(formData.get("stock_alert_threshold") as string) || 3;

    if (!id || !name || !categoryId || isNaN(price)) {
        throw new Error("Invalid input");
    }

    const payload: MenuUpdatePayload = {
        name,
        category_id: categoryId,
        price,
        target_type: targetType as "guest" | "cast",
        cast_back_amount: targetType === "cast" ? castBackAmount : 0,
        hide_from_slip: hideFromSlip,
        is_hidden: isHidden,
        image_url: imageUrl || null,
        stock_enabled: stockEnabled,
        stock_quantity: stockEnabled ? stockQuantity : 0,
        stock_alert_threshold: stockEnabled ? stockAlertThreshold : 3,
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
        .from("menus")
        .update(payload)
        .eq("id", id);

    if (error) {
        console.error("Error updating menu:", error);
        throw new Error("Failed to update menu");
    }

    revalidatePath("/app/menus");
    return { success: true };
}

/**
 * メニューを削除
 */
export async function deleteMenu(id: string): Promise<{ success: boolean }> {
    const { supabase } = await checkMenuPermission();

    const { error } = await supabase
        .from("menus")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting menu:", error);
        throw new Error("Failed to delete menu");
    }

    revalidatePath("/app/menus");
    return { success: true };
}

/**
 * メニューを一括作成
 */
export async function bulkCreateMenus(
    items: BulkMenuCreateItem[]
): Promise<{ success: boolean; count: number }> {
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

    const { error } = await supabase
        .from("menus")
        .insert(menusToInsert);

    if (error) {
        console.error("Error bulk creating menus:", error);
        throw new Error("メニューの追加に失敗しました");
    }

    revalidatePath("/app/menus");
    return { success: true, count: items.length };
}

// ============================================
// カテゴリ管理
// ============================================

/**
 * メニューカテゴリを新規作成
 */
export async function createMenuCategory(name: string): Promise<{ success: boolean; category?: MenuCategory }> {
    const { supabase, storeId } = await checkMenuPermission();

    // 最大のsort_orderを取得
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
    return { success: true, category: data as MenuCategory };
}

/**
 * メニューカテゴリを更新
 */
export async function updateMenuCategory(id: string, name: string): Promise<{ success: boolean }> {
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

/**
 * メニューカテゴリを削除
 */
export async function deleteMenuCategory(id: string): Promise<{ success: boolean }> {
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

/**
 * メニューカテゴリの並び順を一括更新
 */
export async function reorderMenuCategories(
    items: CategorySortOrderUpdate[]
): Promise<{ success: boolean }> {
    const { supabase } = await checkMenuPermission();

    for (const item of items) {
        const { error } = await supabase
            .from("menu_categories")
            .update({ sort_order: item.sort_order })
            .eq("id", item.id);

        if (error) {
            console.error("Error updating category sort order:", error);
            throw new Error("Failed to reorder categories");
        }
    }

    revalidatePath("/app/menus");
    return { success: true };
}

// ============================================
// CSVインポート
// ============================================

export interface MenuImportResult {
    success: boolean;
    imported: number;
    skipped: number;
    duplicates: number;
    errors: { row: number; field: string; message: string }[];
}

/**
 * CSVからメニューをインポート
 */
export async function importMenusFromCsv(formData: FormData): Promise<MenuImportResult> {
    const file = formData.get("file") as File | null;
    if (!file) {
        return { success: false, imported: 0, skipped: 0, duplicates: 0, errors: [{ row: 0, field: "", message: "CSVファイルが指定されていません" }] };
    }

    const categoryId = formData.get("categoryId") as string;
    if (!categoryId) {
        return { success: false, imported: 0, skipped: 0, duplicates: 0, errors: [{ row: 0, field: "", message: "カテゴリを選択してください" }] };
    }

    const mappingsJson = formData.get("mappings") as string | null;
    const { supabase, storeId } = await checkMenuPermission();

    const text = await file.text();
    // Remove BOM if present
    const cleanText = text.replace(/^\uFEFF/, "");
    const lines = cleanText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length < 2) {
        return { success: false, imported: 0, skipped: 0, duplicates: 0, errors: [{ row: 0, field: "", message: "CSVに有効なデータ行がありません" }] };
    }

    const header = lines[0].split(",").map(h => h.trim());

    // Use mappings if provided, otherwise fall back to direct column names
    let colIndex: Record<string, number>;
    if (mappingsJson) {
        const mappings = JSON.parse(mappingsJson) as Record<string, string>;
        colIndex = {
            name: mappings.name ? header.indexOf(mappings.name) : -1,
            price: mappings.price ? header.indexOf(mappings.price) : -1,
        };
    } else {
        colIndex = {
            name: header.findIndex(h => h.toLowerCase() === "name"),
            price: header.findIndex(h => h.toLowerCase() === "price"),
        };
    }

    if (colIndex.name === -1) {
        return { success: false, imported: 0, skipped: 0, duplicates: 0, errors: [{ row: 0, field: "name", message: "メニュー名の列がマッピングされていません" }] };
    }
    if (colIndex.price === -1) {
        return { success: false, imported: 0, skipped: 0, duplicates: 0, errors: [{ row: 0, field: "price", message: "価格の列がマッピングされていません" }] };
    }

    // Get existing menu names to check for duplicates
    const { data: existingMenus } = await supabase
        .from("menus")
        .select("name")
        .eq("store_id", storeId)
        .eq("category_id", categoryId);

    const existingNames = new Set(
        (existingMenus || [])
            .map((m: any) => (m.name as string | null)?.trim().toLowerCase())
            .filter((name): name is string => !!name)
    );

    const menusToInsert: Array<{
        store_id: string;
        name: string;
        category_id: string;
        price: number;
    }> = [];
    const errors: { row: number; field: string; message: string }[] = [];
    let skipped = 0;
    let duplicates = 0;

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        const name = values[colIndex.name] || "";
        const priceStr = values[colIndex.price] || "";

        if (!name) {
            skipped++;
            errors.push({ row: i + 1, field: "name", message: "メニュー名が空です" });
            continue;
        }

        if (!priceStr) {
            skipped++;
            errors.push({ row: i + 1, field: "price", message: "価格が空です" });
            continue;
        }

        const price = parseInt(priceStr);
        if (isNaN(price)) {
            skipped++;
            errors.push({ row: i + 1, field: "price", message: "価格が数値ではありません" });
            continue;
        }

        const key = name.toLowerCase();
        if (existingNames.has(key)) {
            duplicates++;
            continue;
        }

        menusToInsert.push({
            store_id: storeId,
            name,
            category_id: categoryId,
            price,
        });

        existingNames.add(key);
    }

    if (menusToInsert.length === 0) {
        revalidatePath("/app/menus");
        revalidatePath("/app/settings/import");
        return { success: true, imported: 0, skipped, duplicates, errors };
    }

    const { error } = await supabase
        .from("menus")
        .insert(menusToInsert);

    if (error) {
        console.error("Error importing menus:", error);
        return { success: false, imported: 0, skipped, duplicates, errors: [{ row: 0, field: "", message: "CSVのインポート中にエラーが発生しました" }] };
    }

    revalidatePath("/app/menus");
    revalidatePath("/app/settings/import");
    return { success: true, imported: menusToInsert.length, skipped, duplicates, errors };
}

// ============================================
// 画像管理
// ============================================

/**
 * メニュー画像をアップロード
 */
export async function uploadMenuImage(formData: FormData): Promise<string> {
    const { supabase } = await getAuthUser();

    const file = formData.get("file") as File;
    if (!file) {
        throw new Error("ファイルが選択されていません");
    }

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

    const {
        data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    return publicUrl;
}

/**
 * メニュー画像を削除
 */
export async function deleteMenuImage(imageUrl: string): Promise<void> {
    const { supabase } = await getAuthUser();

    const urlParts = imageUrl.split("/avatars/");
    if (urlParts.length < 2) {
        return; // 有効なStorageのURLではない場合はスキップ
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage
        .from("avatars")
        .remove([filePath]);

    if (error) {
        console.error("Delete error:", error);
    }
}

// ============================================
// AI機能
// ============================================

/**
 * 画像からメニューを読み取る
 */
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
    } catch {
        console.error("Failed to parse AI response:", content);
        throw new Error("AIの応答を解析できませんでした");
    }
}

/**
 * AIでメニュー画像を生成 (Gemini 2.5 Flash Image)
 */
export async function generateMenuImage(menuName: string): Promise<string> {
    const { supabase } = await getAuthUser();

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error("GOOGLE_API_KEY が設定されていません");
    }

    // メニュー名からアイテムの種類を推測して説明的なプロンプトを生成
    // テキストが画像に含まれないよう、名前を直接引用しない
    const prompt = `IMPORTANT: Generate an image with ZERO text, ZERO letters, ZERO words, ZERO numbers anywhere.

Create a professional product photograph for a bar/restaurant menu. The subject is: ${menuName}

Requirements:
- Large centered product filling 70% of frame
- Simple blurred bar counter background
- Warm ambient lighting
- Sharp focus on product only
- Professional food/drink photography style
- Clean minimal composition
- No garnishes, decorations, or toppings

STRICT RULES - VIOLATION WILL FAIL:
- ABSOLUTELY NO TEXT in the image
- NO letters, numbers, words, labels
- NO brand names, logos, signs
- NO watermarks or writing
- The image must be 100% text-free`;

    // Gemini 2.5 Flash Image API を呼び出し
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: prompt }
                        ]
                    }
                ],
                generationConfig: {
                    responseModalities: ["Image"],
                    imageConfig: {
                        aspectRatio: "1:1"
                    }
                }
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", response.status, errorText);
        throw new Error(`画像の生成に失敗しました (${response.status}): ${errorText.slice(0, 200)}`);
    }

    const result = await response.json();

    // レスポンスから画像データを取得
    const imagePart = result.candidates?.[0]?.content?.parts?.find(
        (part: any) => part.inlineData?.mimeType?.startsWith("image/")
    );

    if (!imagePart?.inlineData?.data) {
        console.error("No image in response:", JSON.stringify(result, null, 2));
        throw new Error("画像が生成されませんでした");
    }

    // Base64をBlobに変換
    const base64Data = imagePart.inlineData.data;
    const binaryData = Buffer.from(base64Data, "base64");

    const fileName = `menu-ai-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const filePath = `menu-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, binaryData, {
            contentType: "image/png",
        });

    if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`画像の保存に失敗しました: ${uploadError.message}`);
    }

    const {
        data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    return publicUrl;
}

// ============================================
// 相場価格調査
// ============================================

export interface ItemMarketPriceResult {
    itemName: string;
    minPrice: number;
    maxPrice: number;
    averagePrice: number;
    recommendedPrice: number;
    priceFactors: string[];
    notes: string;
}

export interface StoreLocationInfo {
    prefecture: string | null;
    industry: string | null;
}

/**
 * 店舗の県・ジャンル情報を取得
 */
export async function getStoreLocationInfo(): Promise<StoreLocationInfo> {
    try {
        const { supabase, storeId } = await getAuthContext();

        const { data, error } = await supabase
            .from("stores")
            .select("prefecture, industry")
            .eq("id", storeId)
            .single();

        if (error) {
            logQueryError(error, "fetching store location info");
            return { prefecture: null, industry: null };
        }

        return {
            prefecture: data?.prefecture || null,
            industry: data?.industry || null,
        };
    } catch {
        return { prefecture: null, industry: null };
    }
}

/**
 * AIで商品の相場価格を調査 (Gemini 2.0 Flash)
 */
export async function researchItemMarketPrice(
    itemName: string,
    prefecture: string,
    industry: string,
    category?: string
): Promise<ItemMarketPriceResult> {
    await getAuthUser(); // 認証チェック

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error("GOOGLE_API_KEY が設定されていません");
    }

    const systemPrompt = `あなたは日本のナイトエンターテインメント業界（キャバクラ、ラウンジ、ホストクラブ、ガールズバー等）に詳しい専門家です。

指定された商品の相場価格を調査し、以下のJSON形式で返してください：

{
  "itemName": "商品名",
  "minPrice": 最低価格（円、整数）,
  "maxPrice": 最高価格（円、整数）,
  "averagePrice": 平均価格（円、整数）,
  "recommendedPrice": 推奨価格（円、整数、地域と業態を考慮）,
  "priceFactors": ["価格に影響する要因1", "価格に影響する要因2"],
  "notes": "この商品の価格設定に関するアドバイス"
}

注意点：
- 指定された地域（県）の物価水準を考慮してください
- 指定された業態（キャバクラ、ラウンジ等）の一般的な価格帯を考慮してください
- カテゴリーが指定されている場合は、そのカテゴリー（ドリンク、ボトル、フード等）の価格帯も考慮してください
- 東京・大阪などの大都市は高め、地方は低めに設定してください
- 価格は税込で記載してください
- 推奨価格は地域、業態、カテゴリーを総合的に判断して設定してください

必ずJSON形式のみで返答してください。説明文は不要です。`;

    const userPrompt = `「${itemName}」の相場価格を教えてください。
地域: ${prefecture}
業態: ${industry}${category ? `\nカテゴリー: ${category}` : ""}`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: `${systemPrompt}\n\n${userPrompt}` }
                        ]
                    }
                ],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.7,
                }
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", response.status, errorText);
        throw new Error("相場調査に失敗しました");
    }

    const result = await response.json();
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
        throw new Error("AIからの応答がありません");
    }

    try {
        const parsed = JSON.parse(content) as ItemMarketPriceResult;
        return parsed;
    } catch {
        console.error("Failed to parse AI response:", content);
        throw new Error("AIの応答を解析できませんでした");
    }
}

// ============================================
// メニューオプション管理
// ============================================

/**
 * 店舗の全オプション一覧を取得
 */
export async function getMenuOptions(): Promise<MenuOption[]> {
    const { supabase, storeId } = await getAuthContext();

    const { data, error } = await supabase
        .from("menu_options")
        .select(`
            *,
            choices:menu_option_choices(*)
        `)
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true });

    if (error) {
        logQueryError(error, "fetching menu options");
        return [];
    }

    // choicesをsort_orderでソート
    return (data || []).map(option => ({
        ...option,
        choices: (option.choices || []).sort((a: MenuOptionChoice, b: MenuOptionChoice) => a.sort_order - b.sort_order)
    }));
}

/**
 * メニューに紐づくオプション一覧を取得
 */
export async function getMenuOptionsForMenu(menuId: string): Promise<MenuOption[]> {
    const { supabase } = await getAuthContext();

    const { data, error } = await supabase
        .from("menu_option_links")
        .select(`
            *,
            option:menu_options(
                *,
                choices:menu_option_choices(*)
            )
        `)
        .eq("menu_id", menuId)
        .order("sort_order", { ascending: true });

    if (error) {
        logQueryError(error, "fetching menu option links");
        return [];
    }

    // オプションを抽出してchoicesをソート
    return (data || [])
        .filter(link => link.option)
        .map(link => ({
            ...link.option,
            choices: (link.option.choices || []).sort((a: MenuOptionChoice, b: MenuOptionChoice) => a.sort_order - b.sort_order)
        }));
}

/**
 * オプションを作成
 */
export async function createMenuOption(input: MenuOptionInput): Promise<MenuOption> {
    const { supabase, storeId } = await checkMenuPermission();

    // オプション本体を作成
    const { data: option, error: optionError } = await supabase
        .from("menu_options")
        .insert({
            store_id: storeId,
            name: input.name,
            sort_order: 0,
        })
        .select()
        .single();

    if (optionError) {
        logQueryError(optionError, "creating menu option");
        throw new Error("オプションの作成に失敗しました");
    }

    // 選択肢を作成
    if (input.choices.length > 0) {
        const choicesData = input.choices.map((choice, index) => ({
            option_id: option.id,
            name: choice.name,
            additional_price: choice.additional_price,
            sort_order: index,
        }));

        const { error: choicesError } = await supabase
            .from("menu_option_choices")
            .insert(choicesData);

        if (choicesError) {
            logQueryError(choicesError, "creating menu option choices");
            // オプションを削除
            await supabase.from("menu_options").delete().eq("id", option.id);
            throw new Error("選択肢の作成に失敗しました");
        }
    }

    revalidatePath("/app/menus");
    return option;
}

/**
 * オプションを更新
 */
export async function updateMenuOption(optionId: string, input: MenuOptionInput): Promise<void> {
    const { supabase } = await checkMenuPermission();

    // オプション名を更新
    const { error: optionError } = await supabase
        .from("menu_options")
        .update({ name: input.name, updated_at: new Date().toISOString() })
        .eq("id", optionId);

    if (optionError) {
        logQueryError(optionError, "updating menu option");
        throw new Error("オプションの更新に失敗しました");
    }

    // 既存の選択肢を取得
    const { data: existingChoices } = await supabase
        .from("menu_option_choices")
        .select("id")
        .eq("option_id", optionId);

    const existingIds = new Set((existingChoices || []).map(c => c.id));
    const inputIds = new Set(input.choices.filter(c => c.id).map(c => c.id));

    // 削除された選択肢を削除
    const toDelete = [...existingIds].filter(id => !inputIds.has(id));
    if (toDelete.length > 0) {
        await supabase
            .from("menu_option_choices")
            .delete()
            .in("id", toDelete);
    }

    // 選択肢を更新/作成
    for (let i = 0; i < input.choices.length; i++) {
        const choice = input.choices[i];
        if (choice.id && existingIds.has(choice.id)) {
            // 更新
            await supabase
                .from("menu_option_choices")
                .update({
                    name: choice.name,
                    additional_price: choice.additional_price,
                    sort_order: i,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", choice.id);
        } else {
            // 新規作成
            await supabase
                .from("menu_option_choices")
                .insert({
                    option_id: optionId,
                    name: choice.name,
                    additional_price: choice.additional_price,
                    sort_order: i,
                });
        }
    }

    revalidatePath("/app/menus");
}

/**
 * オプションを削除
 */
export async function deleteMenuOption(optionId: string): Promise<void> {
    const { supabase } = await checkMenuPermission();

    const { error } = await supabase
        .from("menu_options")
        .delete()
        .eq("id", optionId);

    if (error) {
        logQueryError(error, "deleting menu option");
        throw new Error("オプションの削除に失敗しました");
    }

    revalidatePath("/app/menus");
}

/**
 * メニューにオプションを紐付け
 */
export async function linkOptionToMenu(menuId: string, optionId: string): Promise<void> {
    const { supabase } = await checkMenuPermission();

    // 既存のリンク数を取得してsort_orderを決定
    const { count } = await supabase
        .from("menu_option_links")
        .select("*", { count: "exact", head: true })
        .eq("menu_id", menuId);

    const { error } = await supabase
        .from("menu_option_links")
        .insert({
            menu_id: menuId,
            option_id: optionId,
            sort_order: count || 0,
        });

    if (error) {
        if (error.code === "23505") {
            // 既に紐付けられている
            return;
        }
        logQueryError(error, "linking option to menu");
        throw new Error("オプションの紐付けに失敗しました");
    }

    revalidatePath("/app/menus");
}

/**
 * メニューからオプションを解除
 */
export async function unlinkOptionFromMenu(menuId: string, optionId: string): Promise<void> {
    const { supabase } = await checkMenuPermission();

    const { error } = await supabase
        .from("menu_option_links")
        .delete()
        .eq("menu_id", menuId)
        .eq("option_id", optionId);

    if (error) {
        logQueryError(error, "unlinking option from menu");
        throw new Error("オプションの解除に失敗しました");
    }

    revalidatePath("/app/menus");
}

/**
 * メニューのオプション紐付けを一括更新
 */
export async function updateMenuOptionLinks(menuId: string, optionIds: string[]): Promise<void> {
    const { supabase } = await checkMenuPermission();

    // 既存のリンクを削除
    await supabase
        .from("menu_option_links")
        .delete()
        .eq("menu_id", menuId);

    // 新しいリンクを作成
    if (optionIds.length > 0) {
        const linksData = optionIds.map((optionId, index) => ({
            menu_id: menuId,
            option_id: optionId,
            sort_order: index,
        }));

        const { error } = await supabase
            .from("menu_option_links")
            .insert(linksData);

        if (error) {
            logQueryError(error, "updating menu option links");
            throw new Error("オプションの紐付け更新に失敗しました");
        }
    }

    revalidatePath("/app/menus");
}
