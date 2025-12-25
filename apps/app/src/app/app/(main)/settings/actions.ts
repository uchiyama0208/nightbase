"use server";

import { getAuthContext, getAuthContextForPage, getAuthUser } from "@/lib/auth-helpers";
import { createServerClient } from "@/lib/supabaseServerClient";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
    TimecardSettingsPayload,
    FeatureSettingsPayload,
    StoreUpdatePayload,
    SlipSettingsPayload,
    GeocodeResult,
    PostalCodeSearchResult,
    SettingsDataResult,
} from "./types";

// ============================================
// 店舗作成・削除
// ============================================

/**
 * 新しい店舗を作成
 */
export async function createStore(formData: FormData): Promise<void> {
    const storeName = formData.get("storeName") as string;
    const profileDisplayName = (formData.get("profileDisplayName") as string | null) ?? null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createServerClient() as any;

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    if (!storeName) {
        throw new Error("Store name is required");
    }

    // 1. 店舗を作成
    const { data: store, error: storeError } = await supabase
        .from("stores")
        .insert({
            name: storeName,
        })
        .select()
        .single();

    if (storeError) {
        console.error("Error creating store:", storeError);
        throw new Error("Failed to create store");
    }

    // 1.5. 店舗設定を作成
    const { error: settingsError } = await supabase
        .from("store_settings")
        .insert({
            store_id: store.id,
            show_menus: true,
        });

    if (settingsError) {
        console.error("Error creating store settings:", settingsError);
        await supabase.from("stores").delete().eq("id", store.id);
        throw new Error("Failed to create store settings");
    }

    // 2. プロフィール（管理者）を作成
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .insert({
            user_id: user.id,
            store_id: store.id,
            role: "admin",
            display_name: profileDisplayName && profileDisplayName.trim().length > 0
                ? profileDisplayName.trim()
                : "Admin",
        })
        .select()
        .single();

    if (profileError || !profile) {
        console.error("Error creating profile:", profileError);
        await supabase.from("stores").delete().eq("id", store.id);
        throw new Error("Failed to create profile");
    }

    // 3. usersテーブルのcurrent_profile_idを設定
    const { error: userUpdateError } = await supabase
        .from("users")
        .upsert(
            {
                id: user.id,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                email: (user as any).email ?? null,
                current_profile_id: profile.id,
            },
            { onConflict: "id" }
        );

    if (userUpdateError) {
        console.error("Error setting current_profile_id on users:", userUpdateError);
    }

    revalidatePath("/app/settings");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/(main)", "layout");
    redirect("/app/settings");
}

/**
 * 店舗を削除
 */
export async function deleteStore(): Promise<void> {
    const { supabase, storeId, profileId } = await getAuthContext({ requireStaff: true });

    // 現在のプロフィールの情報を取得
    const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", profileId)
        .maybeSingle();

    if (!profile?.user_id) {
        throw new Error("Profile not found");
    }

    // 店舗を削除（CASCADE DELETEが関連データを処理）
    const { error } = await supabase
        .from("stores")
        .delete()
        .eq("id", storeId);

    if (error) {
        console.error("Error deleting store:", error);
        throw new Error("店舗の削除に失敗しました");
    }

    // current_profile_idをnullに更新
    await supabase
        .from("users")
        .update({ current_profile_id: null })
        .eq("id", profile.user_id);

    revalidatePath("/", "layout");
    redirect("/app/me");
}

// ============================================
// 設定データ取得
// ============================================

/**
 * 設定ページ用のデータを取得
 */
export async function getSettingsData(): Promise<SettingsDataResult> {
    const result = await getAuthContextForPage({ requireStaff: true });

    if ("redirect" in result) {
        return { redirect: result.redirect };
    }

    return { success: true };
}

// ============================================
// 店舗情報更新
// ============================================

/**
 * 店舗情報を更新
 */
export async function updateStore(formData: FormData): Promise<void> {
    const { supabase, storeId } = await getAuthContext({ requireStaff: true });

    const closedDays = formData.getAll("closed_days") as string[];

    // stores テーブル用のペイロード
    const storePayload = {
        name: formData.get("name") as string,
        industry: (formData.get("industry") as string) || null,
        prefecture: (formData.get("prefecture") as string) || null,
        city: (formData.get("city") as string) || null,
        address_line1: (formData.get("address_line1") as string) || null,
        address_line2: (formData.get("address_line2") as string) || null,
        postal_code: (formData.get("postal_code") as string) || null,
        updated_at: new Date().toISOString(),
    };

    // store_settings テーブル用のペイロード
    const settingsPayload = {
        business_start_time: (formData.get("business_start_time") as string) || null,
        business_end_time: (formData.get("business_end_time") as string) || null,
        day_switch_time: (formData.get("day_switch_time") as string) || null,
        closed_days: closedDays.length > 0 ? closedDays : null,
        allow_join_requests: formData.get("allow_join_requests") === "on",
        updated_at: new Date().toISOString(),
    };

    // stores テーブルを更新
    const { error: storeError } = await supabase
        .from("stores")
        .update(storePayload)
        .eq("id", storeId);

    if (storeError) {
        console.error("Error updating store:", storeError);
        throw new Error("店舗情報の更新に失敗しました");
    }

    // store_settings テーブルを更新
    const { error: settingsError } = await supabase
        .from("store_settings")
        .update(settingsPayload)
        .eq("store_id", storeId);

    if (settingsError) {
        console.error("Error updating store settings:", settingsError);
        throw new Error("店舗設定の更新に失敗しました");
    }

    revalidatePath("/app/settings/store");
    revalidatePath("/app/settings");
    revalidatePath("/app/(main)", "layout");
}

// ============================================
// タイムカード設定
// ============================================

/**
 * タイムカード設定を更新
 */
export async function updateTimecardSettings(formData: FormData): Promise<void> {
    const { supabase, storeId } = await getAuthContext();

    const tabletTimecardEnabled = formData.get("tabletTimecardEnabled") === "on";

    // latitude/longitude are stored in stores table, not store_settings
    const latitude = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null;
    const longitude = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null;

    const payload: TimecardSettingsPayload = {
        show_break_columns: formData.get("showBreakColumns") === "on",
        tablet_timecard_enabled: tabletTimecardEnabled,
        location_check_enabled: formData.get("locationCheckEnabled") === "on",
        location_radius: formData.get("locationRadius") ? parseInt(formData.get("locationRadius") as string) : 50,
        time_rounding_enabled: formData.get("timeRoundingEnabled") === "on",
        time_rounding_method: (formData.get("timeRoundingMethod") as string) || "round",
        time_rounding_minutes: formData.get("timeRoundingMinutes") ? parseInt(formData.get("timeRoundingMinutes") as string) : 15,
        auto_clockout_enabled: formData.get("autoClockoutEnabled") === "on",
        pickup_enabled_cast: formData.get("pickupEnabledCast") === "on",
        pickup_enabled_staff: formData.get("pickupEnabledStaff") === "on",
    };

    if (tabletTimecardEnabled) {
        const tabletAllowedRoles = formData.getAll("tabletAllowedRoles") as string[];
        payload.tablet_acceptance_start_time = (formData.get("tabletAcceptanceStartTime") as string) || null;
        payload.tablet_acceptance_end_time = (formData.get("tabletAcceptanceEndTime") as string) || null;
        payload.tablet_allowed_roles = tabletAllowedRoles.length > 0 ? tabletAllowedRoles : ["staff", "cast"];
        payload.tablet_theme = (formData.get("tabletTheme") as string) || "light";
    }

    // Update store_settings
    const { error } = await supabase
        .from("store_settings")
        .update(payload)
        .eq("store_id", storeId);

    if (error) {
        console.error("Error updating store timecard settings:", error);
        throw new Error(`Failed to update timecard settings: ${error.message}`);
    }

    // Update latitude/longitude in stores table
    if (latitude !== null || longitude !== null) {
        const { error: storeError } = await supabase
            .from("stores")
            .update({ latitude, longitude })
            .eq("id", storeId);

        if (storeError) {
            console.error("Error updating store location:", storeError);
            throw new Error(`Failed to update store location: ${storeError.message}`);
        }
    }

    revalidatePath("/app/settings");
    revalidatePath("/app/settings/timecard");
    revalidatePath("/app/timecard");
    revalidatePath(`/tablet/timecard/${storeId}`);
}

// ============================================
// 機能設定
// ============================================

/**
 * 機能の有効/無効設定を更新
 */
export async function updateFeatureSettings(formData: FormData): Promise<void> {
    const { supabase, storeId } = await getAuthContext();

    const payload: FeatureSettingsPayload = {
        show_dashboard: formData.get("show_dashboard") === "on",
        show_attendance: formData.get("show_attendance") === "on",
        show_timecard: formData.get("show_timecard") === "on",
        show_users: formData.get("show_users") === "on",
        show_roles: formData.get("show_roles") === "on",
    };

    const { error } = await supabase
        .from("store_settings")
        .update(payload)
        .eq("store_id", storeId);

    if (error) {
        console.error("Error updating feature settings:", error);
        throw new Error("Failed to update feature settings");
    }

    revalidatePath("/app/settings");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/attendance");
    revalidatePath("/app/users");
    revalidatePath("/app/roles");
    revalidatePath("/app/(main)", "layout");
    revalidatePath("/app/features");
    redirect("/app/features");
}

// ============================================
// テーマ設定
// ============================================

/**
 * ユーザーのテーマ設定を更新
 */
export async function updateTheme(theme: string): Promise<void> {
    const { supabase, profileId } = await getAuthContext();

    const { error } = await supabase
        .from("profiles")
        .update({ theme })
        .eq("id", profileId);

    if (error) {
        console.error("Error updating theme:", error);
        throw new Error("Failed to update theme");
    }

    revalidatePath("/", "layout");
}

// ============================================
// 店舗アイコン
// ============================================

/**
 * 店舗アイコンをアップロード
 */
export async function uploadStoreIcon(formData: FormData): Promise<{ success: boolean; publicUrl: string }> {
    const { supabase, storeId } = await getAuthContext({ requireStaff: true });

    const file = formData.get("file") as File;
    if (!file) throw new Error("ファイルが選択されていません");

    const fileExt = file.name.split(".").pop();
    const fileName = `store-${storeId}-${Date.now()}.${fileExt}`;
    const filePath = `store-icons/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

    if (uploadError) throw new Error(`アップロードに失敗しました: ${uploadError.message}`);

    const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

    const { error: updateError } = await supabase
        .from("stores")
        .update({ icon_url: publicUrl })
        .eq("id", storeId);

    if (updateError) throw new Error(`更新に失敗しました: ${updateError.message}`);

    revalidatePath("/app/settings/store");
    return { success: true, publicUrl };
}

/**
 * 店舗アイコンを削除
 */
export async function deleteStoreIcon(): Promise<{ success: boolean }> {
    const { supabase, storeId } = await getAuthContext({ requireStaff: true });

    // 現在のアイコンURLを取得
    const { data: store } = await supabase
        .from("stores")
        .select("icon_url")
        .eq("id", storeId)
        .single();

    if (store?.icon_url) {
        const url = new URL(store.icon_url);
        const path = `store-icons/${url.pathname.split("/").pop()}`;
        await supabase.storage.from("avatars").remove([path]);
    }

    const { error } = await supabase
        .from("stores")
        .update({ icon_url: null })
        .eq("id", storeId);

    if (error) throw new Error(`削除に失敗しました: ${error.message}`);

    revalidatePath("/app/settings/store");
    return { success: true };
}

// ============================================
// 伝票設定
// ============================================

/**
 * 伝票設定を更新
 */
export async function updateSlipSettings(formData: FormData): Promise<void> {
    const { supabase, storeId } = await getAuthContext({ requireStaff: true });

    const slip_rounding_enabled_raw = formData.get("slip_rounding_enabled");
    const slip_rounding_enabled = slip_rounding_enabled_raw === "on" || slip_rounding_enabled_raw === "true";
    const slip_rounding_method = formData.get("slip_rounding_method") as string || "round";
    const slip_rounding_unit_str = formData.get("slip_rounding_unit") as string;
    const slip_rounding_unit = slip_rounding_unit_str ? parseInt(slip_rounding_unit_str) : 10;

    // バリデーション
    if (slip_rounding_enabled && !["round", "ceil", "floor"].includes(slip_rounding_method)) {
        throw new Error("Invalid rounding method");
    }

    if (slip_rounding_enabled && ![10, 100, 1000, 10000].includes(slip_rounding_unit)) {
        throw new Error("Invalid rounding unit");
    }

    const payload: SlipSettingsPayload = {
        slip_rounding_enabled,
        updated_at: new Date().toISOString(),
    };

    if (slip_rounding_enabled) {
        payload.slip_rounding_method = slip_rounding_method;
        payload.slip_rounding_unit = slip_rounding_unit;
    } else {
        payload.slip_rounding_method = null;
        payload.slip_rounding_unit = null;
    }

    const { error } = await supabase
        .from("store_settings")
        .update(payload)
        .eq("store_id", storeId);

    if (error) {
        console.error("Error updating slip settings:", error);
        throw new Error(`伝票設定の更新に失敗しました: ${error.message}`);
    }

    revalidatePath("/app/settings/slip");
    revalidatePath("/app/floor");
    revalidatePath("/app/slips");
}

// ============================================
// 認証
// ============================================

/**
 * サインアウト
 */
export async function signOut(): Promise<void> {
    const { supabase } = await getAuthUser();
    await supabase.auth.signOut();
    redirect("/login");
}

// ============================================
// 外部API連携
// ============================================

/**
 * 住所からジオコーディング
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&accept-language=ja`,
            {
                headers: {
                    "User-Agent": "Nightbase/1.0 (info@nightbase.jp)"
                }
            }
        );

        if (!response.ok) {
            console.error("Geocoding API error:", response.status, response.statusText);
            return { error: "Geocoding failed" };
        }

        const data = await response.json();

        if (data && data.length > 0) {
            return {
                success: true,
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon)
            };
        }

        return { error: "Address not found" };
    } catch (error) {
        console.error("Geocoding error:", error);
        return { error: "Geocoding request failed" };
    }
}

/**
 * 郵便番号から住所を検索
 */
export async function searchAddressByPostalCode(postalCode: string): Promise<PostalCodeSearchResult> {
    try {
        const cleanPostalCode = postalCode.replace(/-/g, "");

        const response = await fetch(
            `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanPostalCode}`,
            {
                method: "GET",
            }
        );

        if (!response.ok) {
            return { error: "Failed to fetch address" };
        }

        const data = await response.json();

        if (data.status === 200 && data.results && data.results.length > 0) {
            const result = data.results[0];
            return {
                success: true,
                prefecture: result.address1,
                city: result.address2,
                addressLine1: result.address3
            };
        }

        return { error: "Address not found" };
    } catch (error) {
        console.error("Postal code search error:", error);
        return { error: "Request failed" };
    }
}

// ============================================
// ページデータ取得（SPA用）
// ============================================

/**
 * 店舗設定ページ用データ取得
 */
export async function getStoreSettingsPageData() {
    const authResult = await getAuthContextForPage();

    if ("redirect" in authResult) {
        return { redirect: authResult.redirect };
    }

    const { context, storeName } = authResult;
    const supabase = context.supabase;

    // 店舗情報を取得
    const { data: store } = await supabase
        .from("stores")
        .select("*")
        .eq("id", context.storeId)
        .single();

    if (!store) {
        return { redirect: "/app/settings" };
    }

    // store_settings からも設定を取得
    const { data: storeSettings } = await supabase
        .from("store_settings")
        .select("business_start_time, business_end_time, day_switch_time, closed_days, allow_join_requests")
        .eq("store_id", context.storeId)
        .single();

    const storeWithSettings = {
        ...store,
        business_start_time: storeSettings?.business_start_time || null,
        business_end_time: storeSettings?.business_end_time || null,
        day_switch_time: storeSettings?.day_switch_time || null,
        closed_days: storeSettings?.closed_days || [],
        allow_join_requests: storeSettings?.allow_join_requests || false,
    };

    return {
        data: {
            store: storeWithSettings,
        }
    };
}

/**
 * タイムカード設定ページ用データ取得
 */
export async function getTimecardSettingsPageData() {
    const authResult = await getAuthContextForPage();

    if ("redirect" in authResult) {
        return { redirect: authResult.redirect };
    }

    const { context } = authResult;
    const supabase = context.supabase;

    // 店舗情報を取得
    const { data: store } = await supabase
        .from("stores")
        .select("*")
        .eq("id", context.storeId)
        .single();

    if (!store) {
        return { redirect: "/app/settings" };
    }

    // store_settings からタイムカード関連設定を取得
    const { data: storeSettings } = await supabase
        .from("store_settings")
        .select(`
            show_break_columns,
            tablet_timecard_enabled,
            tablet_allowed_roles,
            tablet_acceptance_start_time,
            tablet_acceptance_end_time,
            tablet_theme,
            location_check_enabled,
            location_radius,
            time_rounding_enabled,
            time_rounding_method,
            time_rounding_minutes,
            auto_clockout_enabled,
            pickup_enabled_cast,
            pickup_enabled_staff
        `)
        .eq("store_id", context.storeId)
        .single();

    // store と storeSettings をマージ
    const storeWithSettings = {
        ...store,
        ...storeSettings,
    };

    return {
        data: {
            store: storeWithSettings,
        }
    };
}

/**
 * フロア設定ページ用データ取得
 */
export async function getFloorSettingsPageData() {
    const authResult = await getAuthContextForPage();

    if ("redirect" in authResult) {
        return { redirect: authResult.redirect };
    }

    const { context } = authResult;
    const supabase = context.supabase;

    // 店舗情報を取得
    const { data: store } = await supabase
        .from("stores")
        .select("*")
        .eq("id", context.storeId)
        .single();

    if (!store) {
        return { redirect: "/app/settings" };
    }

    return {
        data: {
            store,
        }
    };
}

/**
 * シフト設定ページ用データ取得
 */
export async function getShiftSettingsPageData() {
    const authResult = await getAuthContextForPage();

    if ("redirect" in authResult) {
        return { redirect: authResult.redirect };
    }

    const { context } = authResult;
    const supabase = context.supabase;

    // 店舗情報を取得
    const { data: store } = await supabase
        .from("stores")
        .select("*")
        .eq("id", context.storeId)
        .single();

    if (!store) {
        return { redirect: "/app/settings" };
    }

    // Get automation settings
    const { data: automationSettings } = await supabase
        .from("shift_automation_settings")
        .select("*")
        .eq("store_id", context.storeId)
        .maybeSingle();

    return {
        data: {
            store,
            automationSettings: automationSettings || null,
        }
    };
}

/**
 * 伝票設定ページ用データ取得
 */
export async function getSlipSettingsPageData() {
    const authResult = await getAuthContextForPage();

    if ("redirect" in authResult) {
        return { redirect: authResult.redirect };
    }

    const { context } = authResult;
    const supabase = context.supabase;

    // 店舗情報を取得
    const { data: store } = await supabase
        .from("stores")
        .select("*")
        .eq("id", context.storeId)
        .single();

    if (!store) {
        return { redirect: "/app/settings" };
    }

    return {
        data: {
            store,
        }
    };
}

/**
 * インポート設定ページ用データ取得
 */
export async function getImportSettingsPageData() {
    const authResult = await getAuthContextForPage();

    if ("redirect" in authResult) {
        return { redirect: authResult.redirect };
    }

    const { context } = authResult;
    const supabase = context.supabase;

    // メニューカテゴリを取得
    const { data: categories } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("store_id", context.storeId)
        .order("sort_order", { ascending: true });

    return {
        data: {
            menuCategories: categories || [],
        }
    };
}

// ============================================
// タイムカードカスタム質問
// ============================================

export interface TimecardQuestion {
    id: string;
    store_id: string;
    label: string;
    field_type: string;
    options: string[] | null;
    is_required: boolean;
    target_role: string;
    timing: string;
    sort_order: number;
    is_active: boolean;
}

/**
 * タイムカード質問一覧を取得
 */
export async function getTimecardQuestions(): Promise<TimecardQuestion[]> {
    const { supabase, storeId } = await getAuthContext();

    const { data, error } = await supabase
        .from("timecard_questions")
        .select("*")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("Error fetching timecard questions:", error);
        return [];
    }

    return data || [];
}

/**
 * タイムカード質問を作成
 */
export async function createTimecardQuestion(question: {
    label: string;
    field_type: string;
    options?: string[] | null;
    is_required?: boolean;
    target_role: string;
    timing: string;
}): Promise<{ success: boolean; question?: TimecardQuestion; error?: string }> {
    const { supabase, storeId } = await getAuthContext({ requireStaff: true });

    // Get the max sort_order
    const { data: maxOrderData } = await supabase
        .from("timecard_questions")
        .select("sort_order")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

    const nextOrder = (maxOrderData?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
        .from("timecard_questions")
        .insert({
            store_id: storeId,
            label: question.label,
            field_type: question.field_type,
            options: question.options || null,
            is_required: question.is_required ?? false,
            target_role: question.target_role,
            timing: question.timing,
            sort_order: nextOrder,
            is_active: true,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating timecard question:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/settings/timecard");
    return { success: true, question: data };
}

/**
 * タイムカード質問を更新
 */
export async function updateTimecardQuestion(
    questionId: string,
    updates: {
        label?: string;
        field_type?: string;
        options?: string[] | null;
        is_required?: boolean;
        target_role?: string;
        timing?: string;
        is_active?: boolean;
    }
): Promise<{ success: boolean; error?: string }> {
    const { supabase, storeId } = await getAuthContext({ requireStaff: true });

    const { error } = await supabase
        .from("timecard_questions")
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq("id", questionId)
        .eq("store_id", storeId);

    if (error) {
        console.error("Error updating timecard question:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/settings/timecard");
    return { success: true };
}

/**
 * タイムカード質問を削除
 */
export async function deleteTimecardQuestion(questionId: string): Promise<{ success: boolean; error?: string }> {
    const { supabase, storeId } = await getAuthContext({ requireStaff: true });

    const { error } = await supabase
        .from("timecard_questions")
        .delete()
        .eq("id", questionId)
        .eq("store_id", storeId);

    if (error) {
        console.error("Error deleting timecard question:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/app/settings/timecard");
    return { success: true };
}

/**
 * タイムカード質問の順序を更新
 */
export async function updateTimecardQuestionsOrder(
    questionOrders: { id: string; sort_order: number }[]
): Promise<{ success: boolean; error?: string }> {
    const { supabase, storeId } = await getAuthContext({ requireStaff: true });

    for (const { id, sort_order } of questionOrders) {
        const { error } = await supabase
            .from("timecard_questions")
            .update({ sort_order, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("store_id", storeId);

        if (error) {
            console.error("Error updating question order:", error);
            return { success: false, error: error.message };
        }
    }

    revalidatePath("/app/settings/timecard");
    return { success: true };
}

/**
 * タイムカード質問回答を保存
 */
export async function saveTimecardQuestionAnswers(
    workRecordId: string,
    answers: { questionId: string; value: string; timing: string }[]
): Promise<{ success: boolean; error?: string }> {
    const { supabase, storeId } = await getAuthContext();

    for (const answer of answers) {
        const { error } = await supabase
            .from("timecard_question_answers")
            .upsert(
                {
                    work_record_id: workRecordId,
                    question_id: answer.questionId,
                    value: answer.value,
                    timing: answer.timing,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "work_record_id,question_id,timing" }
            );

        if (error) {
            console.error("Error saving timecard answer:", error);
            return { success: false, error: error.message };
        }
    }

    return { success: true };
}

/**
 * 有効なタイムカード質問を取得（役割とタイミングでフィルタ）
 */
export async function getActiveTimecardQuestions(
    role: string,
    timing: "clock_in" | "clock_out"
): Promise<TimecardQuestion[]> {
    const { supabase, storeId } = await getAuthContext();

    const { data, error } = await supabase
        .from("timecard_questions")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .or(`target_role.eq.both,target_role.eq.${role}`)
        .or(`timing.eq.both,timing.eq.${timing}`)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("Error fetching active timecard questions:", error);
        return [];
    }

    return data || [];
}
